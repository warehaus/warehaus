SRC_DIR := $(shell pwd)
DIST_DIR := $(shell pwd)/dist
DOCKER_IMAGE := labsome/labsome
EGG_BUILDER_IMAGE := python:2.7
NODE_BUILDER_IMAGE := node:5.4
FRONTEND_BUILDER_IMAGE := labsome/frontend-builder:v5
DOCKER_RUN_CMDLINE := docker run -ti --rm
LOCAL_LOGS := ~/.labsome/logs

build: build-backend build-frontend

build-frontend:
	@echo "Building frontend..."
	@$(DOCKER_RUN_CMDLINE) \
		--volume $(SRC_DIR):/build \
		$(FRONTEND_BUILDER_IMAGE) \
		/bin/sh -c "cd /build/frontend && bower install --allow-root && gulp build"

build-backend:
	@echo "Building API egg..."
	@$(DOCKER_RUN_CMDLINE) \
		--volume $(SRC_DIR):/opt \
		$(EGG_BUILDER_IMAGE) \
		/bin/sh -c "cd /opt/backend/api-server && python setup.py bdist_egg --exclude-source-files --dist-dir /opt/dist/pkg"
	@echo "Building notify server..."
	@$(DOCKER_RUN_CMDLINE) \
		--volume $(SRC_DIR):/opt \
		$(NODE_BUILDER_IMAGE) \
		/bin/sh -c "cd /opt/dist/pkg && npm pack /opt/backend/notify-server"

docker-image: build
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE):latest .

run: docker-image
	@echo "Running..."
	@mkdir -p $(LOCAL_LOGS)
	@$(DOCKER_RUN_CMDLINE) \
		--link rethinkdb \
		--port 80:80 \
		--volume $(LOCAL_LOGS):/var/log/labsome \
		$(DOCKER_IMAGE):latest

test: docker-image
	@echo "Running backend tests..."
	@$(DOCKER_RUN_CMDLINE) \
		--link rethinkdb \
		--volume $(SRC_DIR):/opt/src \
		$(DOCKER_IMAGE):latest \
		bash -c "cd /opt/src/backend/api-server && python setup.py test"

tagged-docker-image: docker-image
	@if [ ! -z "$(TRAVIS_TAG)" ]; then \
		echo "Tagging image: $(DOCKER_IMAGE):$(TRAVIS_TAG)"; \
		docker tag $(DOCKER_IMAGE):latest $(DOCKER_IMAGE):$(TRAVIS_TAG); \
	fi

push-docker-image: tagged-docker-image
	@if [ ! -z "$(DOCKER_EMAIL)" ]; then \
		echo "Logging in to Docker Hub"; \
		docker login -e="$(DOCKER_EMAIL)" -u="$(DOCKER_USERNAME)" -p="$(DOCKER_PASSWORD)"; \
	fi
	@echo "Pushing image..."
	@docker push $(DOCKER_IMAGE)
