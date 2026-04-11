# weird bugs and todo
- session regenerate call ruins the csrf helper which is set during context creation--> can this be solved via some post-render callback?
- need to delve deeper into helmet and test in prod if `upgradeInsecureRequests` causes any problem
- related to helmet --> the whole end-user `config.js` should prolly use premade environments for caches etc and (allow user defined csp settings on the other hand)
- add the metadata parsing from original project and apply rate limiting
- when refactoring config.js --> also make so that metadata is hot-reloaded on dev env

# scripts and stuff:

#### https://dev.to/erinbush/npm-linking-and-unlinking-2h1g

#### symlink clean:
rm -f $(npm bin -g)/sivu
ls $(npm bin -g)

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

