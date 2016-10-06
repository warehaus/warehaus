SRC_DIR := $(shell pwd)
BUILD_IMAGE := node:6
DOCKER_IMAGE := warehaus/warehaus

build:
	@echo "Building..."
	@docker run -ti --rm \
		--volume $(SRC_DIR):/build \
		$(BUILD_IMAGE) \
		/bin/sh -c "cd /build && npm install && npm run build"

docker-image: build
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE):dev .

push-docker-image: docker-image
	@docker login -e="$(DOCKER_EMAIL)" -u="$(DOCKER_USERNAME)" -p="$(DOCKER_PASSWORD)";
	@if [ ! -z "$(TRAVIS_TAG)" ]; then \
		echo "Tagging image: $(DOCKER_IMAGE):$(TRAVIS_TAG)"; \
		docker tag $(DOCKER_IMAGE):dev $(DOCKER_IMAGE):$(TRAVIS_TAG); \
		docker tag $(DOCKER_IMAGE):dev $(DOCKER_IMAGE):latest; \
		echo "Pushing image..."; \
		docker push $(DOCKER_IMAGE):$(TRAVIS_TAG); \
		docker push $(DOCKER_IMAGE):latest; \
	else \
		docker push $(DOCKER_IMAGE):dev; \
	fi
