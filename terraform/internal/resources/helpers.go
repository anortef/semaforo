package resources

import (
	"github.com/hashicorp/terraform-plugin-framework/path"
)

func typesPath(name string) path.Path {
	return path.Root(name)
}
