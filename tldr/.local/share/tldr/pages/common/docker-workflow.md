# docker-workflow

> Common Docker workflows and useful commands.
> Custom page for Docker operations.

- Remove all stopped containers:

`docker container prune -f`

- Remove all unused images:

`docker image prune -a -f`

- Remove all unused volumes:

`docker volume prune -f`

- Clean up everything (containers, images, volumes, networks):

`docker system prune -a --volumes -f`

- Show container logs with timestamp and follow:

`docker logs -f --timestamps {{container}}`

- Show last N lines of logs and follow:

`docker logs -f --tail {{100}} {{container}}`

- Execute interactive bash shell in running container:

`docker exec -it {{container}} /bin/bash`

- Execute interactive sh shell (for alpine images):

`docker exec -it {{container}} /bin/sh`

- Copy file from container to host:

`docker cp {{container}}:{{/path/in/container}} {{/path/on/host}}`

- Copy file from host to container:

`docker cp {{/path/on/host}} {{container}}:{{/path/in/container}}`

- Show resource usage statistics for all containers:

`docker stats`

- Show running containers with custom format:

`docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`

- Show all containers (including stopped) with custom format:

`docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"`

- Inspect container details in JSON:

`docker inspect {{container}}`

- Show container IP address:

`docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' {{container}}`
