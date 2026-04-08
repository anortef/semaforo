package main

import (
	"context"
	"log"

	"github.com/anortef/terraform-provider-semaforo/internal/provider"
	"github.com/hashicorp/terraform-plugin-framework/providerserver"
)

func main() {
	err := providerserver.Serve(context.Background(), provider.New, providerserver.ServeOpts{
		Address: "registry.terraform.io/semaforo/semaforo",
	})
	if err != nil {
		log.Fatal(err)
	}
}
