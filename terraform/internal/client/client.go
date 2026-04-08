package client

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

var ErrNotFound = errors.New("resource not found")

type SemaforoClient struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
}

func NewClient(baseURL, email, password string) (*SemaforoClient, error) {
	c := &SemaforoClient{
		BaseURL:    strings.TrimRight(baseURL, "/"),
		HTTPClient: &http.Client{},
	}

	var loginResp struct {
		Token string `json:"token"`
	}
	err := c.doRequest("POST", "/api/auth/login", map[string]string{
		"email":    email,
		"password": password,
	}, &loginResp)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: %w", err)
	}
	c.Token = loginResp.Token
	return c, nil
}

func (c *SemaforoClient) doRequest(method, path string, body interface{}, result interface{}) error {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == 404 {
		return ErrNotFound
	}
	if resp.StatusCode == 204 {
		return nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiErr struct {
			Error string `json:"error"`
		}
		if json.Unmarshal(respBody, &apiErr) == nil && apiErr.Error != "" {
			return fmt.Errorf("API error (%d): %s", resp.StatusCode, apiErr.Error)
		}
		return fmt.Errorf("API error (%d): %s", resp.StatusCode, string(respBody))
	}

	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("failed to parse response: %w", err)
		}
	}
	return nil
}

// Apps

func (c *SemaforoClient) CreateApp(name, key, description string) (*AppDTO, error) {
	var result AppDTO
	err := c.doRequest("POST", "/api/apps", map[string]string{
		"name": name, "key": key, "description": description,
	}, &result)
	return &result, err
}

func (c *SemaforoClient) GetApp(id string) (*AppDTO, error) {
	var result AppDTO
	err := c.doRequest("GET", "/api/apps/"+id, nil, &result)
	return &result, err
}

func (c *SemaforoClient) DeleteApp(id string) error {
	err := c.doRequest("DELETE", "/api/apps/"+id, nil, nil)
	if errors.Is(err, ErrNotFound) {
		return nil
	}
	return err
}

// Environments

func (c *SemaforoClient) CreateEnvironment(appID, name, key string) (*EnvironmentDTO, error) {
	var result EnvironmentDTO
	err := c.doRequest("POST", "/api/apps/"+appID+"/environments", map[string]string{
		"name": name, "key": key,
	}, &result)
	return &result, err
}

func (c *SemaforoClient) ListEnvironments(appID string) ([]EnvironmentDTO, error) {
	var result []EnvironmentDTO
	err := c.doRequest("GET", "/api/apps/"+appID+"/environments", nil, &result)
	return result, err
}

func (c *SemaforoClient) UpdateEnvironment(id string, name *string, cacheTtl *int64) (*EnvironmentDTO, error) {
	body := map[string]interface{}{}
	if name != nil {
		body["name"] = *name
	}
	if cacheTtl != nil {
		body["cacheTtlSeconds"] = *cacheTtl
	}
	var result EnvironmentDTO
	err := c.doRequest("PATCH", "/api/environments/"+id, body, &result)
	return &result, err
}

func (c *SemaforoClient) DeleteEnvironment(id string) error {
	err := c.doRequest("DELETE", "/api/environments/"+id, nil, nil)
	if errors.Is(err, ErrNotFound) {
		return nil
	}
	return err
}

// Toggles

func (c *SemaforoClient) CreateToggle(appID, name, key, description, toggleType string) (*ToggleDTO, error) {
	var result ToggleDTO
	err := c.doRequest("POST", "/api/apps/"+appID+"/toggles", map[string]string{
		"name": name, "key": key, "description": description, "type": toggleType,
	}, &result)
	return &result, err
}

func (c *SemaforoClient) ListToggles(appID string) ([]ToggleDTO, error) {
	var result []ToggleDTO
	err := c.doRequest("GET", "/api/apps/"+appID+"/toggles", nil, &result)
	return result, err
}

func (c *SemaforoClient) DeleteToggle(id string) error {
	err := c.doRequest("DELETE", "/api/toggles/"+id, nil, nil)
	if errors.Is(err, ErrNotFound) {
		return nil
	}
	return err
}

// Toggle Values

func (c *SemaforoClient) SetToggleValue(toggleID, envID string, enabled bool, stringValue string, rolloutPercentage int64) (*ToggleValueDTO, error) {
	var result ToggleValueDTO
	err := c.doRequest("PUT", "/api/toggles/"+toggleID+"/environments/"+envID, map[string]interface{}{
		"enabled": enabled, "stringValue": stringValue, "rolloutPercentage": rolloutPercentage,
	}, &result)
	return &result, err
}

func (c *SemaforoClient) ListToggleValues(appID string) ([]ToggleValueDTO, error) {
	var result []ToggleValueDTO
	err := c.doRequest("GET", "/api/apps/"+appID+"/toggle-values", nil, &result)
	return result, err
}

// Secrets

func (c *SemaforoClient) CreateSecret(appID, key, description string) (*SecretDTO, error) {
	var result SecretDTO
	err := c.doRequest("POST", "/api/apps/"+appID+"/secrets", map[string]string{
		"key": key, "description": description,
	}, &result)
	return &result, err
}

func (c *SemaforoClient) ListSecrets(appID string) ([]SecretDTO, error) {
	var result []SecretDTO
	err := c.doRequest("GET", "/api/apps/"+appID+"/secrets", nil, &result)
	return result, err
}

func (c *SemaforoClient) DeleteSecret(id string) error {
	err := c.doRequest("DELETE", "/api/secrets/"+id, nil, nil)
	if errors.Is(err, ErrNotFound) {
		return nil
	}
	return err
}

// Secret Values

func (c *SemaforoClient) SetSecretValue(secretID, envID, value string) error {
	return c.doRequest("PUT", "/api/secrets/"+secretID+"/environments/"+envID, map[string]string{
		"value": value,
	}, nil)
}

func (c *SemaforoClient) RevealSecretValue(secretID, envID string) (*RevealedSecretValueDTO, error) {
	var result RevealedSecretValueDTO
	err := c.doRequest("POST", "/api/secrets/"+secretID+"/environments/"+envID+"/reveal", nil, &result)
	return &result, err
}

// API Keys

func (c *SemaforoClient) CreateApiKey(envID string) (*ApiKeyDTO, error) {
	var result ApiKeyDTO
	err := c.doRequest("POST", "/api/environments/"+envID+"/api-keys", nil, &result)
	return &result, err
}

func (c *SemaforoClient) ListApiKeys(envID string) ([]ApiKeyDTO, error) {
	var result []ApiKeyDTO
	err := c.doRequest("GET", "/api/environments/"+envID+"/api-keys", nil, &result)
	return result, err
}

func (c *SemaforoClient) DeleteApiKey(id string) error {
	err := c.doRequest("DELETE", "/api/api-keys/"+id, nil, nil)
	if errors.Is(err, ErrNotFound) {
		return nil
	}
	return err
}
