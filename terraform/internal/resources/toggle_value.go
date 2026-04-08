package resources

import (
	"context"
	"fmt"
	"strings"

	"github.com/anortef/terraform-provider-semaforo/internal/client"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/booldefault"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/int64default"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringdefault"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
)

type toggleValueResource struct{ client *client.SemaforoClient }

type toggleValueResourceModel struct {
	ID                types.String `tfsdk:"id"`
	AppID             types.String `tfsdk:"app_id"`
	ToggleID          types.String `tfsdk:"toggle_id"`
	EnvironmentID     types.String `tfsdk:"environment_id"`
	Enabled           types.Bool   `tfsdk:"enabled"`
	StringValue       types.String `tfsdk:"string_value"`
	RolloutPercentage types.Int64  `tfsdk:"rollout_percentage"`
}

func NewToggleValueResource() resource.Resource { return &toggleValueResource{} }

func (r *toggleValueResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_toggle_value"
}

func (r *toggleValueResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "Manages a toggle value for a specific environment.",
		Attributes: map[string]schema.Attribute{
			"id":             schema.StringAttribute{Computed: true, PlanModifiers: []planmodifier.String{stringplanmodifier.UseStateForUnknown()}},
			"app_id":         schema.StringAttribute{Required: true, PlanModifiers: []planmodifier.String{stringplanmodifier.RequiresReplace()}},
			"toggle_id":      schema.StringAttribute{Required: true, PlanModifiers: []planmodifier.String{stringplanmodifier.RequiresReplace()}},
			"environment_id": schema.StringAttribute{Required: true, PlanModifiers: []planmodifier.String{stringplanmodifier.RequiresReplace()}},
			"enabled":           schema.BoolAttribute{Optional: true, Computed: true, Default: booldefault.StaticBool(false)},
			"string_value":      schema.StringAttribute{Optional: true, Computed: true, Default: stringdefault.StaticString("")},
			"rollout_percentage": schema.Int64Attribute{Optional: true, Computed: true, Default: int64default.StaticInt64(100)},
		},
	}
}

func (r *toggleValueResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.SemaforoClient)
}

func (r *toggleValueResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan toggleValueResourceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	tv, err := r.client.SetToggleValue(
		plan.ToggleID.ValueString(), plan.EnvironmentID.ValueString(),
		plan.Enabled.ValueBool(), plan.StringValue.ValueString(), plan.RolloutPercentage.ValueInt64(),
	)
	if err != nil {
		resp.Diagnostics.AddError("Failed to set toggle value", err.Error())
		return
	}

	plan.ID = types.StringValue(tv.ID.Value)
	plan.Enabled = types.BoolValue(tv.Enabled)
	plan.StringValue = types.StringValue(tv.StringValue)
	plan.RolloutPercentage = types.Int64Value(tv.RolloutPercentage)
	resp.Diagnostics.Append(resp.State.Set(ctx, plan)...)
}

func (r *toggleValueResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state toggleValueResourceModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	values, err := r.client.ListToggleValues(state.AppID.ValueString())
	if err != nil {
		resp.Diagnostics.AddError("Failed to read toggle values", err.Error())
		return
	}

	for _, v := range values {
		if v.ToggleID == state.ToggleID.ValueString() && v.EnvironmentID == state.EnvironmentID.ValueString() {
			state.ID = types.StringValue(v.ID.Value)
			state.Enabled = types.BoolValue(v.Enabled)
			state.StringValue = types.StringValue(v.StringValue)
			state.RolloutPercentage = types.Int64Value(v.RolloutPercentage)
			resp.Diagnostics.Append(resp.State.Set(ctx, state)...)
			return
		}
	}

	resp.State.RemoveResource(ctx)
}

func (r *toggleValueResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan toggleValueResourceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	tv, err := r.client.SetToggleValue(
		plan.ToggleID.ValueString(), plan.EnvironmentID.ValueString(),
		plan.Enabled.ValueBool(), plan.StringValue.ValueString(), plan.RolloutPercentage.ValueInt64(),
	)
	if err != nil {
		resp.Diagnostics.AddError("Failed to update toggle value", err.Error())
		return
	}

	plan.ID = types.StringValue(tv.ID.Value)
	plan.Enabled = types.BoolValue(tv.Enabled)
	plan.StringValue = types.StringValue(tv.StringValue)
	plan.RolloutPercentage = types.Int64Value(tv.RolloutPercentage)
	resp.Diagnostics.Append(resp.State.Set(ctx, plan)...)
}

func (r *toggleValueResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state toggleValueResourceModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	// No delete API — reset to defaults
	_, err := r.client.SetToggleValue(
		state.ToggleID.ValueString(), state.EnvironmentID.ValueString(),
		false, "", 100,
	)
	if err != nil {
		resp.Diagnostics.AddError("Failed to reset toggle value", err.Error())
	}
}

func (r *toggleValueResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
	parts := strings.Split(req.ID, "/")
	if len(parts) != 3 {
		resp.Diagnostics.AddError("Invalid import ID", fmt.Sprintf("Expected format: app_id/toggle_id/environment_id, got: %s", req.ID))
		return
	}
	resp.Diagnostics.Append(resp.State.SetAttribute(ctx, typesPath("app_id"), parts[0])...)
	resp.Diagnostics.Append(resp.State.SetAttribute(ctx, typesPath("toggle_id"), parts[1])...)
	resp.Diagnostics.Append(resp.State.SetAttribute(ctx, typesPath("environment_id"), parts[2])...)
}
