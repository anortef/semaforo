package provider

import (
	"context"
	"os"

	"github.com/anortef/terraform-provider-semaforo/internal/client"
	"github.com/anortef/terraform-provider-semaforo/internal/resources"
	"github.com/hashicorp/terraform-plugin-framework/datasource"
	"github.com/hashicorp/terraform-plugin-framework/provider"
	"github.com/hashicorp/terraform-plugin-framework/provider/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/types"
)

type semaforoProvider struct{}

type semaforoProviderModel struct {
	URL      types.String `tfsdk:"url"`
	Email    types.String `tfsdk:"email"`
	Password types.String `tfsdk:"password"`
}

func New() provider.Provider {
	return &semaforoProvider{}
}

func (p *semaforoProvider) Metadata(_ context.Context, _ provider.MetadataRequest, resp *provider.MetadataResponse) {
	resp.TypeName = "semaforo"
}

func (p *semaforoProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "Terraform provider for the Semaforo feature toggle platform.",
		Attributes: map[string]schema.Attribute{
			"url": schema.StringAttribute{
				Description: "Base URL of the Semaforo API. Can also be set via SEMAFORO_URL env var.",
				Optional:    true,
			},
			"email": schema.StringAttribute{
				Description: "Admin email for authentication. Can also be set via SEMAFORO_EMAIL env var.",
				Optional:    true,
			},
			"password": schema.StringAttribute{
				Description: "Admin password for authentication. Can also be set via SEMAFORO_PASSWORD env var.",
				Optional:    true,
				Sensitive:   true,
			},
		},
	}
}

func (p *semaforoProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
	var config semaforoProviderModel
	resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
	if resp.Diagnostics.HasError() {
		return
	}

	url := envOrValue(config.URL, "SEMAFORO_URL")
	email := envOrValue(config.Email, "SEMAFORO_EMAIL")
	password := envOrValue(config.Password, "SEMAFORO_PASSWORD")

	if url == "" {
		resp.Diagnostics.AddError("Missing URL", "Set 'url' in provider config or SEMAFORO_URL env var.")
		return
	}
	if email == "" {
		resp.Diagnostics.AddError("Missing Email", "Set 'email' in provider config or SEMAFORO_EMAIL env var.")
		return
	}
	if password == "" {
		resp.Diagnostics.AddError("Missing Password", "Set 'password' in provider config or SEMAFORO_PASSWORD env var.")
		return
	}

	c, err := client.NewClient(url, email, password)
	if err != nil {
		resp.Diagnostics.AddError("Authentication Failed", err.Error())
		return
	}

	resp.ResourceData = c
	resp.DataSourceData = c
}

func (p *semaforoProvider) Resources(_ context.Context) []func() resource.Resource {
	return []func() resource.Resource{
		resources.NewAppResource,
		resources.NewEnvironmentResource,
		resources.NewToggleResource,
		resources.NewToggleValueResource,
		resources.NewSecretResource,
		resources.NewSecretValueResource,
		resources.NewApiKeyResource,
	}
}

func (p *semaforoProvider) DataSources(_ context.Context) []func() datasource.DataSource {
	return nil
}

func envOrValue(val types.String, envKey string) string {
	if !val.IsNull() && !val.IsUnknown() && val.ValueString() != "" {
		return val.ValueString()
	}
	return os.Getenv(envKey)
}
