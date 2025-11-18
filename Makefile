# Makefile for Docker stack management

.PHONY: help up up-pg down logs rebuild clean health secrets

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[36m
]
GREEN := \033[32m
]
YELLOW := \033[33m
]
RED := \033[31m
]
RESET := \033[0m
]

help: ## Show this help message
	@echo "$(BLUE)TG Marketer Docker Stack$(RESET)"
	@echo ""
	@echo "$(GREEN)Available commands:$(RESET)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}\' $(MAKEFILE_LIST)

secrets: ## Create required secret files
	@echo "$(BLUE)Creating secret files...$(RESET)"
	@mkdir -p secrets
	@if [ ! -f secrets/sqlite_key.txt ]; then \
		openssl rand -hex 32 > secrets/sqlite_key.txt; \
		echo "$(GREEN)Created SQLite encryption key$(RESET)"; \
	fi
	@if [ ! -f secrets/minio_access_key.txt ]; then \
		echo "minioadmin" > secrets/minio_access_key.txt; \
		echo "$(GREEN)Created MinIO access key$(RESET)"; \
	fi
	@if [ ! -f secrets/minio_secret_key.txt ]; then \
		echo "minioadmin123" > secrets/minio_secret_key.txt; \
		echo "$(GREEN)Created MinIO secret key$(RESET)"; \
	fi
	@echo "$(YELLOW)Remember to update .env with your configuration!$(RESET)"

up: secrets ## Start with SQLite profile (default)
	@echo "$(BLUE)Starting TG Marketer with SQLite + Litestream...$(RESET)"
	@docker compose --profile sqlite up -d
	@$(MAKE) endpoints

up-pg: secrets ## Start with PostgreSQL profile
	@echo "$(BLUE)Starting TG Marketer with PostgreSQL + pgBackRest...$(RESET)"
	@docker compose --profile postgres up -d
	@$(MAKE) endpoints

up-watch: secrets ## Start with auto-updates enabled
	@echo "$(BLUE)Starting TG Marketer with Watchtower auto-updates...$(RESET)"
	@docker compose --profile sqlite --profile watchtower up -d
	@$(MAKE) endpoints

down: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(RESET)"
	@docker compose down

logs: ## Show logs from all services
	@docker compose logs -f

logs-api: ## Show API logs only
	@docker compose logs -f api

logs-web: ## Show web logs only
	@docker compose logs -f web

logs-db: ## Show database logs only
	@docker compose logs -f db sqlite-db

rebuild: ## Rebuild and restart services
	@echo "$(BLUE)Rebuilding services...$(RESET)"
	@docker compose build --no-cache
	@docker compose up -d

health: ## Check health of all services
	@echo "$(BLUE)Service Health Status:$(RESET)"
	@docker compose ps

clean: ## Remove all containers, volumes, and images
	@echo "$(RED)This will remove ALL data. Are you sure? [y/N]$(RESET)" && read ans && [ $${ans:-N} = y ]
	@docker compose down -v --remove-orphans
	@docker system prune -af --volumes

endpoints: ## Show available endpoints
	@echo ""
	@echo "$(GREEN)🚀 TG Marketer is running!$(RESET)"
	@echo ""
	@echo "$(BLUE)Web Application:$(RESET)"
	@echo "  https://app.localhost"
	@echo ""
	@echo "$(BLUE)API Endpoint:$(RESET)"
	@echo "  https://api.localhost"
	@echo ""
	@if docker compose ps minio >/dev/null 2>&1; then \
		echo "$(BLUE)MinIO Console (SQLite backups):$(RESET)"; \
		echo "  http://localhost:9001"; \
		echo "  Username: minioadmin"; \
		echo "  Password: minioadmin123"; \
		echo ""; \
	fi
	@echo "$(YELLOW)Note: For HTTPS to work locally, you may need to accept the self-signed certificate$(RESET)"

backup-now: ## Trigger immediate backup (PostgreSQL)
	@echo "$(BLUE)Triggering immediate backup...$(RESET)"
	@docker compose exec pgbackrest pgbackrest --stanza=main backup --type=full

restore-db: ## Restore database from backup (PostgreSQL)
	@echo "$(RED)This will restore the database. Are you sure? [y/N]$(RESET)" && read ans && [ $${ans:-N} = y ]
	@docker compose exec pgbackrest pgbackrest --stanza=main restore

# Development helpers
dev-reset: ## Reset development environment
	@$(MAKE) down
	@docker volume rm $$(docker volume ls -q | grep tg-marketer) 2>/dev/null || true
	@$(MAKE) up

dev-shell-api: ## Open shell in API container
	@docker compose exec api sh

dev-shell-db: ## Open shell in database container
	@docker compose exec db psql -U appuser -d appdb 2>/dev/null || docker compose exec sqlite-db sh