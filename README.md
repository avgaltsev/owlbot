```bash
docker build -t avgaltsev/owlbot:0.0.0 ./
```

```bash
docker volume create owlbot-config
```

Copy `src/config/config.example.json` as `config.json` to the volume `owlbot-config` and edit it.

```bash
docker run -d --name owlbot --restart always -v owlbot-config:/root/config/ avgaltsev/owlbot:0.0.0
```
