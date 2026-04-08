package client

type IDWrapper struct {
	Value string `json:"value"`
}

type AppDTO struct {
	ID          IDWrapper `json:"id"`
	Name        string    `json:"name"`
	Key         string    `json:"key"`
	Description string    `json:"description"`
	CreatedAt   string    `json:"createdAt"`
}

type EnvironmentDTO struct {
	ID              IDWrapper `json:"id"`
	AppID           string    `json:"appId"`
	Name            string    `json:"name"`
	Key             string    `json:"key"`
	CacheTtlSeconds int64    `json:"cacheTtlSeconds"`
	CreatedAt       string    `json:"createdAt"`
}

type ToggleDTO struct {
	ID          IDWrapper `json:"id"`
	AppID       string    `json:"appId"`
	Name        string    `json:"name"`
	Key         string    `json:"key"`
	Description string    `json:"description"`
	Type        string    `json:"type"`
	CreatedAt   string    `json:"createdAt"`
}

type ToggleValueDTO struct {
	ID                IDWrapper `json:"id"`
	ToggleID          string    `json:"toggleId"`
	EnvironmentID     string    `json:"environmentId"`
	Enabled           bool      `json:"enabled"`
	StringValue       string    `json:"stringValue"`
	RolloutPercentage int64     `json:"rolloutPercentage"`
	UpdatedAt         string    `json:"updatedAt"`
}

type SecretDTO struct {
	ID          IDWrapper `json:"id"`
	AppID       string    `json:"appId"`
	Key         string    `json:"key"`
	Description string    `json:"description"`
	CreatedAt   string    `json:"createdAt"`
}

type RevealedSecretValueDTO struct {
	SecretID      string `json:"secretId"`
	EnvironmentID string `json:"environmentId"`
	Value         string `json:"value"`
}

type ApiKeyDTO struct {
	ID            IDWrapper `json:"id"`
	EnvironmentID string    `json:"environmentId"`
	Name          string    `json:"name"`
	Key           string    `json:"key"`
}
