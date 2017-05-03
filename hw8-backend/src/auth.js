const cookieKey = 'sid';
const md5 = require('md5')
const model = require('./model.js')
const bodyParser = require('body-parser')

if (!process.env.REDIS_URL){
    throw "Where is the redis url? Can't store our session data without it!"
}
const redis = require('redis').createClient(process.env.REDIS_URL)

if (!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET)){
    throw "Where are my facebook api client ID and client Secret? We need them for oauth2 with facebook!"
}
const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET
//TODO - how to get htis before starting the server?
const CALLBACK_URL = "http://localhost:3000/auth/facebook/callback"

//see the facebook oauth2 section of http://passportjs.org/docs/oauth2-api,
//as well as the comp431 oauth2 lecture slides
//note that this is used for middleware inside index.js during setup!
const passport = require('passport')
passport.serializeUser(function(user, done) {
    const userObj = {}
    //we need some sort of username in our system - if they have
    //a 'username entry' use it, but probalby oyu'll just have
    //to use their display name. The @Facebook specifies hwo they differ
    //(since normal usernames my frontend sends can't have the @ symbol in them)
    //note that this might be a security vulnrrability in the real world if someone
    //creates an acconut with a username that has an @Facebook in it by sending
    //a CURL or something
    if (user.username) {
        userObj.username = user.username + "@Facebook"
    } else if (user.displayName){
        userObj.username = user.displayName + "@Facebook"
    } else {
        userObj.username = "anon@Facebook"
    }
    //No guarantee the user will give us these! Or the dob (lahtough I believe
    //Facbeook is validating that they're at least of age)
    user.email? userObj.email = user.email : "missingemail@Facebook.notReal"
    user.zipcode? userObj.zipcode = user.zipcode : "00000"
    const profile = initializeProfile(userObj.username, userObj.email, userObj.zipcode)

    //not for security purposes - just to ensure it's easy to look up with mongoose
    const facebookIdHash = md5(user.id)
    facebookAuth(profile, facebookIdHash)
    .then(success => {
        if (success) {
            console.log('registered facbeook user')
            done(null, facebookIdHash)
        } else {
            //delegate to the .catch...
            throw("error with facebook auth")
        }
    })
    .catch(err => {
        console.log('problem somwhere...:', err)
        done(err, null)
    })
})

passport.deserializeUser(function(id, done) {
    console.log('get from the db', id)
    model.User.find({ facebookIdHash: id}).then(response => {
        //And this right here is said callback
        console.log('the response is:', response)
        if (response.length != 0){
            console.log('found the user')
            //so, keep them in the session
            done(null, response[0]) 
        } else {
            //delegate to the .catch to remove it from the session
            throw ('could not find the user')
        }
    })
    .catch(err => {
        console.log('problem on lookup...:', err)
        done(err, null)
    })
})

const FacebookStrategy = require('passport-facebook').Strategy
passport.use(
    new FacebookStrategy({
        clientID: FACEBOOK_CLIENT_ID,
        clientSecret: FACEBOOK_CLIENT_SECRET,
        callbackURL: CALLBACK_URL
    }, (accessToken, refreshToken, profile, done) => {
        console.log('returned facebook profile is:', profile)
        console.log('and the id is', profile.id)
        process.nextTick(function() {
            //'profile' is the facebook profile - this function is the one the oauth section
            //mentions that 'invoke[s] a callback with a user object'
            //i.e. what gets sent to 'serializeUser'
            console.log('ok, sending profile to serializer:', profile)
            return done(null, profile)
        })
    })
)


/**
 * Remember, never store the passwords themselves in the database!
 * (If you don't understand why that is, go read up on security best-practices)
 * 
 * TODO - md5 isn't neccessarily the best hash funciton to use, but
 * specifically is allowed for this assignment (maybe change to bcrypt later?)
 */
const generateSalt = username => md5(username + Date.now());
const saltAndHashPassword = (salt, password) => md5(password + salt);

/**
 * Will maintain in-memory map for tracking session info, accessing the database
 * to authenticate user credentials (after which it creates a cookie for the
 * client to send us each time)
 */
const login = (req, res) => {
    console.log('Payload received', req.body)
    console.log('\n\n')
    console.log('\n\n')
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        console.log('invalid login request')
        res.sendStatus(400)
        return
    }

    model.User.find({username: username}).then(response => {
        //TODO - this print might be a security vuln if kept in production.
        //might want to remove it before then
        console.log('for requested username', username, 'database contained ', response)

        //should only be returning one user object per username - otherwise there is a problem
        if (response.length != 1) {
            console.log('Likely an invalid user, or the database is messed up')
            res.sendStatus(401) 
            return
        }
        const userObj = response[0]
        const saltedInput = password + userObj.salt
        const hashedInput = md5(saltedInput)
        if (hashedInput === userObj.hash){
            //TODO - not really secure, but 'good enough' for this assignment.
            //In reality, use a better rng (window.crypto?) and possibly hash
            const dateStr = new Date().getTime().toString()
            const randomStr = Math.random().toString()
            const sid = md5(dateStr + randomStr)
            console.log('our new session id is:', sid)
            redis.hmset(sid, userObj)
            redis.hgetall(sid, (err, userObj) => {
                if (err) {
                    console.log('Uh oh! Problem creating session cookie')
                    res.sendStatus(401)
                    throw 'Problem accessing newly created sesion cookie in redis?'
                }
                console.log(sid, 'mapped to ', userObj)
            })
            //we'll be needign this cookie on all incoming requests to check if logged in   
            console.log('setting response cookie')
            res.cookie(cookieKey, sid, {maxAge: 3600*1000, httpOnly: true})

            console.log('sending login success message back')
            const msg = {username: username, result: 'success'}
            res.send(msg)
        } else {
            console.log('Valid user, but provided password hashed to incorrect value')

            //TODO - this print might be a security vuln if kept in production.
            //might want to remove it before then
            console.log('Resulting hash was', hashedInput)
            const msg = {username: username, result: 'failure'}
            res.send(msg)
        }
    }).catch(err => {
        console.log('problem with database lookup:', err)
        res.sendStatus(400)
        return
    })
}

/**
 * The only tricky part is that date of birth might be null, and I've decided
 * to allow that (for now at least)
 */
const initializeProfile = (username, email, zipcode, dob) => {
    const profile = dob && dob.toString() ? {
            'username': username, 
            'status': 'I got 99 problems, but a dob aint one',
            'following': [ ],
            'email': email,
            'zipcode': zipcode,
            'dob': dob.toString(),
            'picture': 'http://random-ize.com/lorem-ipsum-generators/lorem-ipsum/lorem-ipsum.jpg'
        } : {
            'username': username, 
            'status': 'I have no status and I must theme',
            'following': [ ],
            'email': email, 
            'zipcode': zipcode,
            'dob': "700000000000",
            'picture': 'http://random-ize.com/lorem-ipsum-generators/lorem-ipsum/lorem-ipsum.jpg'
        } 
    return profile
}

/**
 * Puts them in the map with no salt or password
 */
const facebookAuth = (profile, facebookIdHash) => {
    console.log('If we end up making it, the requested profile will be this:', profile)
    const username = profile.username
    //we don't want to allow multiple users with the same username
    return model.User.find({'username': username})
    .then(response => {
        //TODO - this print might be a security vuln if kept in production.
        //might want to remove it before then
        console.log('for requested username', username, 'database contained ', response)
        //this had better be an empty array, otherwise the user already exists
        if (response.length == 0) {
            console.log('facebook registration can procede: user', username, 'does not already have an entry'); 
            //Going by the instructions, now we have to add exactly two documents: a 'user'...
            return model.User({'username': username, 'facebookIdHash': facebookIdHash}).save()
            .then(response => {
                console.log('\nsuccessful auth-user object creation ', response)
                //...and a profile
                return model.Profile(profile).save()
            })
            .then(response => {
                console.log('successful profile-info object creation', response)
                return true
            }).catch(err => {
                console.log('registered failure. error:', err)
                return false
            })
        } else if (response.length == 1) {
            if (response[0].facebookIdHash == facebookIdHash){
                console.log('User already has an entry - just gotta login')
                return true
            } else {
                console.log('yikes! User already ahs an entry, with a different id...')
                return false
            }
        } else {
            console.log('user has more than one entry in the db?')
        }
    })
    .catch(err => {
        console.log('error on lookup of username?', err)
        return false
    })
}


/**
 * Creates an authentication entry in the database for the registering user,
 * in addition to giving him/her some default profile information
 *
 * This means we have to create one mongoose document for dealing with login auth,
 * and a 'profile' docuemnt with the profile information defaults
 */
const register = (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const zipcode = req.body.zipcode;
    const password = req.body.password;
    //date of birth is not required, but supported if provided
    //This is due to the API and requirements being vague and/or
    //contradictory as to whether we do or do not need it 
    const dob = req.body.dob
    if (!(username && zipcode && email && password)) {
        console.log('missing one of the required fields for registration!')
        res.sendStatus(400)
        return
    }

    const initializedProfile = initializeProfile(username, email, zipcode, dob)
    console.log('If we end up making it, the requested profile will be this:', initializedProfile)

    //we don't want to allow multiple users with the same username
    model.User.find({username: username})
    .then(response => {
        //TODO - this print might be a security vuln if kept in production.
        //might want to remove it before then
        console.log('for requested username', username, 'database contained ', response)
        //this had better be an empty array, otherwise the user already exists
        if (response.length == 0) {
            console.log('registration can procede: user', username, 'does not already have an entry'); 
            const salt = generateSalt(username)
            const passHash = saltAndHashPassword(salt, password)

            //Going by the instructions, now we have to add exactly two documents: a 'user'...
            model.User({'username': username, 'salt': salt, 'hash': passHash}).save()
            .then(response => {
                console.log('\nsuccessful auth-user object creation ', response)
                //...and a profile
                return model.Profile(initializedProfile).save()
            })
            .then(response => {
                console.log('successful profile-info object creation', response)
                const msg = {username: username, result: 'success'}
                res.send(msg)
            }).catch(err => {
                console.log('registered failure. error:', err)
                const msg = {username: username, result: 'failure'}
                res.send(msg)
            })
        } else {
            console.log('Request was to register an lready existing user - not ok!')
            res.sendStatus(401) 
        }
    })
    .catch(err => {
        console.log('error on lookup of username?', err)
        res.sendStatus(400) 
        return
    })
}

const logout = (req, res) => {
    const sid = req.cookies[cookieKey]
    console.log('logging out from this cookie')
    console.log(sid)
    redis.del(sid, (err, response) => {
        if (err){
            console.log('problem logigng out')
            res.sendStatus(400)
        } else {
            console.log('delete worked')
            console.log('(we got this response):', response)
            res.sendStatus(200)
        }
    })
}
const isLoggedInMiddleware = (req, res, next) => {
    const sid = req.cookies[cookieKey]
    if (!sid) {
        //unauthorized since no provided id
        console.log('invalid sid')
        res.sendStatus(400)
        return
    }
    redis.hgetall(sid, (err, userObj) => {
        if (err) {
            console.log('Uh oh! Problem accessing on redis. Looks like an invalid sid cookie')
            res.sendStatus(400)
            return
        } else if (!userObj){
            console.log('uh oh! Couldnt find the user object on redis. Looks logged out?')
            res.sendStatus(401)
            return
        } else {
            console.log(sid, 'mapped to', userObj)
            //so we can quickly get the authentication data when needed
            //without having to provide refrences to the session map elsewhere
            req.userObj = userObj

            //So that changing password doesn't require re-parsing the cookies
            req.sid = sid

            //(read up on how middleware works if this line confuses you)
            next()
        }
    })
}

/**
 * Remember, it's called 'changePassword' but in reality we're just
 * updating the hash in the database - we don't want to be storing the 
 * passwords themselves!
 */
const changePassword = (req, res) => {
    //set from logged in middleware, not the request itself
    const userObj = req.userObj
    //the new password however IS part of the request body
    const newPassword = req.body.password;
    console.log('request username is:', userObj.username)
    if (!newPassword || !userObj)   {
        res.sendStatus(400)
        return;
    } else {
        //probably not strictly neccesary, but won't hurt
        const newSalt = generateSalt(userObj.username)
        const newPasswordHash = saltAndHashPassword(newSalt, newPassword)
        const newUserObj = {
            username: userObj.username,
            salt: newSalt,
            hash: newPasswordHash
        }
        //First arg is the filter, second is the updated stuff
        model.User.findOneAndUpdate({'username': userObj.username}, newUserObj)
        .then(response => {
            console.log('response to the update:', response)
            res.send({'username': userObj.username, 'result':'success'})
        }).catch(err => {
            console.log('problem with updating password:', err)
            res.send({'username': userObj.username, 'result':'failure'})
        })
    }
}

/*
 * We'll be using this guy basically everywehre except for
 * the login and register functions. So it can't quite apply to everything
 * like the standard middleware... but it is close
 */
exports.isLoggedInMiddleware = isLoggedInMiddleware;
exports.passport = passport
exports.setup = (app => {
    //NOTE HOW THESE TWO ARE MIDDLEWARE! To avoid issues, auth.js
    //should be imported before all the other source files 
    app.use(passport.initialize());
    app.use(passport.session());

    //get request here is a simple redirects - on our side they don't affect state
    //nor take any additional information (all that happens on gogole's end)
    app.get('/auth/facebook/login', passport.authenticate('facebook', { scope: 'email'}))
    //passport.authenticate is the route middleware - note that this differs from
    //the example in the docs. Whether it succeeds or fails, it just redirects
    //back to the main page. Only difference is that if it succeeds, before redirecting 
    //back it'll set a session cookie (at which point main page will let them in
    //automatically since they'll have a valid sesion cookie and we check it after refresh)
    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect:'/auth/facebook/success',
        failureRedirect: '/auth/facbeook/failure' 
    }))
    app.get('/auth/facebook/success', (req, res) => {
        res.send({ "Facebook Login Suceeded!": 'Close this window to login automatically'})
    })
    app.get('/auth/facebook/failure', (req, res) => {
        res.send({ "Facebook Login Failed!": 'Close this page and try again'})
    })
    app.post('/login', login)
    app.post('/register', register)
    app.put('/logout', isLoggedInMiddleware, logout)
    app.put('/password', isLoggedInMiddleware, changePassword)
})
