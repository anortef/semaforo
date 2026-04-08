package resources

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/anortef/terraform-provider-semaforo/internal/client"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
)

type secretValueResource struct{ client *client.SemaforoClient }

type secretValueResourceModel struct {
	SecretID      types.String `tfsdk:"secret_id"`
	EnvironmentID types.String `tfsdk:"environment_id"`
	Value         types.String `tfsdk:"value"`
}

func NewSecretValueResource() resource.Resource { return &secretValueResource{} }

func (r *secretValueResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_secret_value"
}

func (r *secretValueResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "Manages a secret value for a specific environment.",
		Attributes: map[string]schema.Attribute{
			"secret_id":      schema.StringAttribute{Required: true, PlanModifiers: []planmodifier.String{stringplanmodifier.RequiresReplace()}},
			"environment_id": schema.StringAttribute{Required: true, PlanModifiers: []planmodifier.String{stringplanmodifier.RequiresReplace()}},
			"value":          schema.StringAttribute{Required: true, Sensitive: true},
		},
	}
}

func (r *secretValueResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.SemaforoClient)
}

func (r *secretValueResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan secretValueResourceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.SetSecretValue(plan.SecretID.ValueString(), plan.EnvironmentID.ValueString(), plan.Value.ValueString())
	if err != nil {
		resp.Diagnostics.AddError("Failed to set secret value", err.Error())
		return
	}

	resp.Diagnostics.Append(resp.State.Set(ctx, plan)...)
}

func (r *secretValueResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state secretValueResourceModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	revealed, err := r.client.RevealSecretValue(state.SecretID.ValueString(), state.EnvironmentID.ValueString())
	if errors.Is(err, client.ErrNotFound) {
		resp.State.RemoveResource(ctx)
		return
	}
	if err != nil {
		resp.Diagnostics.AddError("Failed to read secret value", err.Error())
		return
	}

	state.Value = types.StringValue(revealed.Value)
	resp.Diagnostics.Append(resp.State.Set(ctx, state)...)
}

func (r *secretValueResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan secretValueResourceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.SetSecretValue(plan.SecretID.ValueString(), plan.EnvironmentID.ValueString(), plan.Value.ValueString())
	if err != nil {
		resp.Diagnostics.AddError("Failed to update secret value", err.Error())
		return
	}

	resp.Diagnostics.Append(resp.State.Set(ctx, plan)...)
}

func (r *secretValueResource) Delete(_ context.Context, _ resource.DeleteRequest, _ *resource.DeleteResponse) {
	// No delete API — just remove from state. Cleanup happens when parent resources are deleted.
}

func (r *secretValueResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
	parts := strings.Split(req.ID, "/")
	if len(parts) != 2 {
		resp.Diagnostics.AddError("Invalid import ID", fmt.Sprintf("Expected format: secret_id/environment_id, got: %s", req.ID))
		return
	}
	resp.Diagnostics.Append(resp.State.SetAttribute(ctx, typesPath("secret_id"), parts[0])...)
	resp.Diagnostics.Append(resp.State.SetAttribute(ctx, typesPath("environment_id"), parts[1])...)
}
