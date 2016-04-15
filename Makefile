SRC_DIR := $(shell pwd)
DOCKER_IMAGE := warehaus/warehaus
FRONTEND_BUILDER_IMAGE := warehaus/frontend-builder:v11
DOCKER_RUN_CMDLINE := docker run -ti --rm
LOCAL_LOGS := ~/.warehaus/logs

build: build-frontend

shell:
	@$(DOCKER_RUN_CMDLINE) \
		--link rethinkdb \
		--volume $(SRC_DIR):/opt/warehaus \
		--volume $(LOCAL_LOGS):/var/log/warehaus \
		--publish 80:80 \
		$(DOCKER_IMAGE):dev \
		/bin/bash

build-frontend:
	@echo "Building frontend..."
	@$(DOCKER_RUN_CMDLINE) \
		--volume $(SRC_DIR):/build \
		$(FRONTEND_BUILDER_IMAGE) \
		/bin/sh -c "cd /build/frontend && bower install --allow-root && gulp build"

docker-image: build
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE):dev .

run: docker-image
	@echo "Running..."
	@mkdir -p $(LOCAL_LOGS)
	@$(DOCKER_RUN_CMDLINE) \
		--link rethinkdb \
		--publish 80:80 \
		--volume $(LOCAL_LOGS):/var/log/warehaus \
		$(DOCKER_IMAGE):dev

test: docker-image
	@echo "Running backend tests..."
	@$(DOCKER_RUN_CMDLINE) \
		--link rethinkdb \
		--volume $(SRC_DIR):/opt/src \
		$(DOCKER_IMAGE):dev \
		bash -c "cd /opt/src/backend/api-server && python setup.py test"

push-docker-image: docker-image
	@docker login -e="$(DOCKER_EMAIL)" -u="$(DOCKER_USERNAME)" -p="$(DOCKER_PASSWORD)";
	@if [ ! -z "$(TRAVIS_TAG)" ]; then \
		echo "Tagging image: $(DOCKER_IMAGE):$(TRAVIS_TAG)"; \
		docker tag $(DOCKER_IMAGE):dev $(DOCKER_IMAGE):$(TRAVIS_TAG); \
		docker tag $(DOCKER_IMAGE):dev $(DOCKER_IMAGE):latest; \
		@echo "Pushing image..."; \
		@docker push $(DOCKER_IMAGE):$(TRAVIS_TAG); \
		@docker push $(DOCKER_IMAGE):latest; \
	else \
		@docker push $(DOCKER_IMAGE):dev; \
	fi
