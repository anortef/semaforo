terraform {
  required_providers {
    semaforo = {
      source = "registry.terraform.io/semaforo/semaforo"
    }
  }
}

variable "semaforo_password" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

provider "semaforo" {
  url      = "http://localhost:3001"
  email    = "admin@semaforo.local"
  password = var.semaforo_password
}

# Application
resource "semaforo_app" "shop" {
  name        = "Shop"
  key         = "shop"
  description = "Main e-commerce application"
}

# Environments
resource "semaforo_environment" "production" {
  app_id            = semaforo_app.shop.id
  name              = "Production"
  key               = "production"
  cache_ttl_seconds = 600
}

resource "semaforo_environment" "staging" {
  app_id = semaforo_app.shop.id
  name   = "Staging"
  key    = "staging"
}

# Boolean toggle
resource "semaforo_toggle" "new_checkout" {
  app_id      = semaforo_app.shop.id
  name        = "New Checkout"
  key         = "newCheckout"
  description = "Enables the new checkout flow"
  type        = "boolean"
}

# Toggle values per environment
resource "semaforo_toggle_value" "new_checkout_prod" {
  app_id         = semaforo_app.shop.id
  toggle_id      = semaforo_toggle.new_checkout.id
  environment_id = semaforo_environment.production.id
  enabled        = false
}

resource "semaforo_toggle_value" "new_checkout_staging" {
  app_id         = semaforo_app.shop.id
  toggle_id      = semaforo_toggle.new_checkout.id
  environment_id = semaforo_environment.staging.id
  enabled        = true
}

# String value
resource "semaforo_toggle" "banner_message" {
  app_id = semaforo_app.shop.id
  name   = "Banner Message"
  key    = "bannerMessage"
  type   = "string"
}

resource "semaforo_toggle_value" "banner_prod" {
  app_id         = semaforo_app.shop.id
  toggle_id      = semaforo_toggle.banner_message.id
  environment_id = semaforo_environment.production.id
  string_value   = "Free shipping on orders over $50"
}

# Secret
resource "semaforo_secret" "db_password" {
  app_id      = semaforo_app.shop.id
  key         = "databasePassword"
  description = "PostgreSQL connection password"
}

resource "semaforo_secret_value" "db_password_prod" {
  secret_id      = semaforo_secret.db_password.id
  environment_id = semaforo_environment.production.id
  value          = var.db_password
}

# API key
resource "semaforo_api_key" "prod_key" {
  environment_id = semaforo_environment.production.id
}

output "prod_api_key" {
  value     = semaforo_api_key.prod_key.key
  sensitive = true
}
