const model = require('./model.js')
const isLoggedInMiddleware = require('./auth').isLoggedInMiddleware

const findFollowees = (requestedUser) => {
    console.log("Getting the users that this person follows: ", requestedUser)
    const databaseFilter = {'username': requestedUser}
    return model.Profile.find(databaseFilter).then(response => {
        console.log('response to find:', response)
        return response[0] ? response[0].following : []
    })
}

/**
 * Although similar to code for grabbing emails/zipcodes, it's different enough
 * that we really need to have our own completely isolated function for this stuff
 */
const following = (req, res) => { 
    const requestedUser = req.params.user ? req.params.user : req.userObj.username
    findFollowees(requestedUser)
    .then(following => {
        //('following' as in the people that the requested user is following)
        console.log(requestedUser, 'is following these people:', following)
        res.send({'username': requestedUser, 'following': following})
    })
    .catch(err => {
        console.log('Problem with database query?:', err)
        res.sendStatus(400)
    })
}

/**
 * Cleanest way I found is to do both adding and removing followees is to first
 * do one find operation to get the current follwoers, do operations to
 * get the resulting list, and lastly to do a findAndUpdate to set the followers
 * to the result (which will have the specified follower filtered out or added)
 *
 * For adding, the operations are really simple - check the user isn't already
 * in the list (in which case we don't need to update), and if the user isn't
 * then just concat the latest user onto the end!
 */
const putFollowing = (req, res) => {
    const userToFollow = req.params.user
    if (!userToFollow) {
        res.sendStatus(400)
        return
    }
    console.log('time to follow:', userToFollow)
    const username = req.userObj.username
    findFollowees(username)
    .then(following => {
        //If we're already following them, don't have to actually do anything
        if (following.some(followee => followee === userToFollow)) {
            res.send({'username': username, 'following': following})
            return
        } 

        //Otherwise we have to actually add them and send the update to the database
        console.log('currently following', following)
        const updatedFollowees = following.concat(userToFollow)
        console.log('will be following', updatedFollowees)
        model.Profile.findOneAndUpdate(
            {'username': username}, {'following': updatedFollowees}, {'new':true}
        ).then(response => {
            res.send({'username': response.username, 'following': response.following})
        }).catch(err => {
            console.log('Problem on database update??', err)
            res.sendStatus(400)
        })
    })
    .catch(err => {
        console.log('Problem on database find??', err)
        res.sendStatus(400)
    })
}

/**
 * Deleting is almost the exact same, just with a filter operation
 * Note - yes, this is repeating some code. Howver, it would be dangerous
 * to couple deleting and getting more than they are now, as it would make
 * this particular code much more brittle. Although mostly the same now, they
 * need to be separated out for future updates (possibly in next week even!)
 */
const deleteFollowing = (req, res) => {
    //no default user on this one! Either id is provided or we have a problem
    const userToDelete = req.params.user
    if (!userToDelete) {
        res.sendStatus(400)
        return
    }
    console.log('time to delete:', userToDelete)
    //First step - find out who we follow...
    const username = req.userObj.username
    findFollowees(username)
    .then(following => {
        console.log('User was following:', following)
        //If we're not already following them, don't have to actually do anything
        if (!(following.some(followee => followee === userToDelete))) {
            res.send({'username': username, 'following': following})
            return
        } 

        const updatedFollowees = following.filter((followee) => followee !== userToDelete)
        console.log('updated following:', updatedFollowees)
        model.Profile.findOneAndUpdate(
            {'username': username}, {'following': updatedFollowees}, {'new':true}
        ).then(response => {
            console.log('response to the update:', response)
            res.send({'username': response.username, 'following': response.following})
        }).catch(err => {
            console.log('Problem on database update??', err)
            res.sendStatus(400)
        })
    })
    .catch(err => {
        console.log('Problem on database find??', err)
        res.sendStatus(400)
    })
}
exports.setup = function(app){
    app.get('/following/:user?', isLoggedInMiddleware, following)
    app.put('/following/:user?', isLoggedInMiddleware, putFollowing)
    app.delete('/following/:user?', isLoggedInMiddleware, deleteFollowing)
}
