package resources

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/anortef/terraform-provider-semaforo/internal/client"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/int64default"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
)

type environmentResource struct{ client *client.SemaforoClient }

type environmentResourceModel struct {
	ID              types.String `tfsdk:"id"`
	AppID           types.String `tfsdk:"app_id"`
	Name            types.String `tfsdk:"name"`
	Key             types.String `tfsdk:"key"`
	CacheTtlSeconds types.Int64  `tfsdk:"cache_ttl_seconds"`
}

func NewEnvironmentResource() resource.Resource { return &environmentResource{} }

func (r *environmentResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_environment"
}

func (r *environmentResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "Manages a Semaforo environment within an application.",
		Attributes: map[string]schema.Attribute{
			"id":     schema.StringAttribute{Computed: true, PlanModifiers: []planmodifier.String{stringplanmodifier.UseStateForUnknown()}},
			"app_id": schema.StringAttribute{Required: true, PlanModifiers: []planmodifier.String{stringplanmodifier.RequiresReplace()}},
			"name":   schema.StringAttribute{Required: true},
			"key":    schema.StringAttribute{Required: true, PlanModifiers: []planmodifier.String{stringplanmodifier.RequiresReplace()}},
			"cache_ttl_seconds": schema.Int64Attribute{
				Optional: true, Computed: true, Default: int64default.StaticInt64(300),
			},
		},
	}
}

func (r *environmentResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.SemaforoClient)
}

func (r *environmentResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan environmentResourceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	env, err := r.client.CreateEnvironment(plan.AppID.ValueString(), plan.Name.ValueString(), plan.Key.ValueString())
	if err != nil {
		resp.Diagnostics.AddError("Failed to create environment", err.Error())
		return
	}

	plan.ID = types.StringValue(env.ID.Value)
	plan.CacheTtlSeconds = types.Int64Value(env.CacheTtlSeconds)

	// If TTL differs from default, update it
	desiredTtl := plan.CacheTtlSeconds.ValueInt64()
	if desiredTtl != env.CacheTtlSeconds {
		updated, err := r.client.UpdateEnvironment(env.ID.Value, nil, &desiredTtl)
		if err != nil {
			resp.Diagnostics.AddError("Failed to set cache TTL", err.Error())
			return
		}
		plan.CacheTtlSeconds = types.Int64Value(updated.CacheTtlSeconds)
	}

	resp.Diagnostics.Append(resp.State.Set(ctx, plan)...)
}

func (r *environmentResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state environmentResourceModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	envs, err := r.client.ListEnvironments(state.AppID.ValueString())
	if errors.Is(err, client.ErrNotFound) {
		resp.State.RemoveResource(ctx)
		return
	}
	if err != nil {
		resp.Diagnostics.AddError("Failed to read environments", err.Error())
		return
	}

	for _, env := range envs {
		if env.ID.Value == state.ID.ValueString() {
			state.Name = types.StringValue(env.Name)
			state.Key = types.StringValue(env.Key)
			state.CacheTtlSeconds = types.Int64Value(env.CacheTtlSeconds)
			resp.Diagnostics.Append(resp.State.Set(ctx, state)...)
			return
		}
	}

	resp.State.RemoveResource(ctx)
}

func (r *environmentResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan environmentResourceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	name := plan.Name.ValueString()
	ttl := plan.CacheTtlSeconds.ValueInt64()
	updated, err := r.client.UpdateEnvironment(plan.ID.ValueString(), &name, &ttl)
	if err != nil {
		resp.Diagnostics.AddError("Failed to update environment", err.Error())
		return
	}

	plan.Name = types.StringValue(updated.Name)
	plan.CacheTtlSeconds = types.Int64Value(updated.CacheTtlSeconds)
	resp.Diagnostics.Append(resp.State.Set(ctx, plan)...)
}

func (r *environmentResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state environmentResourceModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}
	if err := r.client.DeleteEnvironment(state.ID.ValueString()); err != nil {
		resp.Diagnostics.AddError("Failed to delete environment", err.Error())
	}
}

func (r *environmentResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
	parts := strings.Split(req.ID, "/")
	if len(parts) != 2 {
		resp.Diagnostics.AddError("Invalid import ID", fmt.Sprintf("Expected format: app_id/environment_id, got: %s", req.ID))
		return
	}
	resp.Diagnostics.Append(resp.State.SetAttribute(ctx, typesPath("app_id"), parts[0])...)
	resp.Diagnostics.Append(resp.State.SetAttribute(ctx, typesPath("id"), parts[1])...)
}
