SRC_DIR := $(shell pwd)
DIST_DIR := $(shell pwd)/dist
DOCKER_IMAGE := labsome/labsome
EGG_BUILDER_IMAGE := python:2.7
FRONTEND_BUILDER_IMAGE := labsome/frontend-builder:v4

build: build-backend build-frontend

build-frontend:
	@echo "Building frontend..."
	@docker run -ti --rm --volume $(SRC_DIR):/build $(FRONTEND_BUILDER_IMAGE) /bin/sh -c "cd /build/frontend && bower install --allow-root && gulp build"

build-backend:
	@echo "Building API egg..."
	@docker run -ti --rm --volume $(SRC_DIR):/opt $(EGG_BUILDER_IMAGE) /bin/sh -c "cd /opt/backend/api-server && python setup.py bdist_egg --exclude-source-files --dist-dir /opt/dist"

docker-image: build
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE):latest .

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
