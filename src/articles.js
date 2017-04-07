const express = require('express')
const bodyParser = require('body-parser')
const loggedInUser = require('./profile').loggedInUser

exports.setup = function(app){
    app.use(bodyParser.json())
    app.get('/', hello)
    app.get('/articles/:id?', getArticles)
    app.post('/article', postArticle)
    app.put('/articles/:id', putArticles)
}

const articles = [
    { id:1, author:'Scott', text:'This is my first article'},
    { id:2, author: 'Max', text:"This is Max's article"},
    { id:3, author: 'Leo', text:"This is Leo's article"}
]

/**
 * Adds a new article to the list of articles, and returns the 
 * newly added article (not all the articles!). However, according
 * to the api specificaiton, even though it just sends one article back,
 * that article has to be wrapped in an array accessed by key 'articles'
*/
const postArticle = (req, res) => {
    const newArticle = req.image ?
    {
        //sadly can't use spread operator here :/
        id: articles.length + 1,
        author: loggedInUser,
        text:req.body.text,
        img:req.image
    } : {
        id: articles.length+1,
        author:loggedInUser,
        text:req.body.text
    }
    articles.push(newArticle)

    //note that wrapping it in an array is on purpose, not a bug!
    const returnedArticle = [newArticle]
    res.send({articles: returnedArticle})
}


/*
 * On no id we just return everything, on an id of an
 * author we return all articles by said author, and on an id of an
 * article we return just that article
*/
const getArticles = (req, res) => {
    const idOrUser = req.params.id
    res.send({
        //logical OR will work as expected assuming no author's id is equal to that
        //of an article. however, the API does not specify what to do in that case
        articles: articles.filter(({id, author}) => {
            return !idOrUser || id === idOrUser || author === idOrUser
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
