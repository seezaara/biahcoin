# Baih coin
the tap bot for make money similar to ( telegram notcoin )

> ![test demo bot now ! ](http://t.me/Biahcoinbot/app)

##  how to setup your own

 - buy a server and domain 
 - set the value of the fallowing variables	 
	```js
	// ================================================ setup
	const  token  =  ""  // telegram bot token
	const  link  =  "https://.....com"  // domain link to connect telegram bot to this server
	const  key  =  fs.readFileSync(__dirname  +  "/key.pem") // ssl key of domain
	const  cert  =  fs.readFileSync(__dirname  +  "/cert.pem") // ssl cert of domain
	// ================================================
	```
 - install nodejs and run the repository
 - use [@BotFather](https://t.me/botfather) (the `/setmenubutton` command or _Bot Settings > Menu Button_) and (use `/newapp` command for setup app to open by url)
 - enjoy the most useless creation of humans 😉

