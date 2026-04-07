# todo:
- proper dispatching
- site registry
- isolation
- daemon mode (later?)
---
1. server should serve the files
2. site registry lookup
3. site config load
4. route dispatching


# other:

sudo nano /etc/hosts

127.0.0.1 site1.test
127.0.0.1 site2.test

http://site1.test:3000
http://site2.test:3000

# ideas:

### should the daemon have internal api for registering sites??? something like:
```
POST /__admin/register
POST /__admin/unregister
POST /__admin/reload"
```
``` 
"fetch("http://localhost:4000/__admin/register", {
  method: "POST",
  body: JSON.stringify({ host, projectDir })
});"
```