# weird bugs and todo
### runtime
- session regenerate call ruins the csrf helper which is set during context creation--> can this be solved via some post-render callback?
- sessions should be tested to make sure there is not any weird stuff going on under the hood when multiple apps are mounted
- move BIF's and superglobals out of `createContext()`
- (LATER) keep in mind that this might need child process support later on so site spesific data should be easily splittable to support that architecture
### server
- need to delve deeper into helmet and test in prod if `upgradeInsecureRequests` causes any problem
- related to helmet --> the whole end-user `config.js` should prolly use premade environments for caches etc and (allow user defined csp settings on the other hand)
- add the metadata parsing from original project and apply rate limiting
- when refactoring config.js --> also make so that metadata is hot-reloaded on dev env
### cli
- scaffolding
- mounting/unmounting
- reloading (metadata/config)
- restarts/stops
- settings
- info/monitor

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

