const express = require('express')
const bodyParser = require('body-parser')
const model = require('./model.js')
const loggedInUser = require('./profile').loggedInUser

exports.setup = function(app){
    app.use(bodyParser.json())
    app.get('/', hello)
    app.get('/articles/:id?', getArticles)
    app.post('/article', postArticle)
    app.put('/articles/:id', putArticles)
}

/**
 * Adds a new article to the list of articles, and returns the 
 * newly added article (not all the articles!). However, according
 * to the api specificaiton, even though it just sends one article back,
 * that article has to be wrapped in an array accessed by key 'articles'
 * On later assignments this will have to allow images (text only right now)
*/
const postArticle = (req, res) => {
    //see https://www.clear.rice.edu/comp431/data/database.html
    //near the bottom for why we no logner populate the 'id' field ourselvsss
    const newArticle = {
        author:loggedInUser,
        text:req.body.text,
        comments: []
    }
    //since the schema has {timestamps: true} it'll automatically set
    //createdAt and updatedAt fields for us
    model.Article(newArticle).save()
    .then(response => {
        console.log('database response:', response) 
        //eventually we'll need to check if we must add an image in
        const returnedArticle = {
            author: response.author,
            text: response.text,
            comments: response.comments,
            id: response._id,
            date: response.createdAt
        }
        console.log('returned article:', returnedArticle)
        //note that wrapping it in an array is on purpose, not a bug!
        res.send({articles: [returnedArticle]})
    })
    .catch(err => {
        console.log(err)
        res.sendStatus(400)
    })
}

/*
 * On no id we just return everything, on an id of an
 * author we return all articles by said author, and on an id of an
 * article we return just that article
*/
const getArticles = (req, res) => {
    console.log('hello??')
    const idOrUser = req.params.id
    res.send({
        //logical OR will work as expected assuming no author's id is equal to that
        //of an article. however, the API does not specify what to do in that case
        articles: articles.filter((article) => {
            return (!idOrUser || idOrUser == article.id || idOrUser == article.author)
        })
    })
}

/*
 * Diffeerent from POST article - this has to do with either editing article text
 * or positing or editing comments. That being said, it's only stubbed here
*/
const putArticles = (req, res) => res.send({
    articles: articles.filter(({id}) => !req.params.id || id == req.params.id) 
})

const hello = (req, res) => res.send({ hello: 'world' })
