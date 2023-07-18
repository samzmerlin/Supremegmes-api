const { Pool } = require('pg');
var express = require("express");
var app = express();
var http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET","HEAD","PUT","PATCH","POST","DELETE"]
  }
});
var sortedGames;
var gameStatPairs;
var games = [];
var stats = [];
var gamesw = [];
var statsw = [];
var otherstuff  = [];
const d = new Date();
let day = d.getDay();
// Create a connection pool
const pool = new Pool({
  host: 'dpg-cip9v0mnqql4qa6tfai0-a',
  port: 5432,
  database: 'data',
  user: 'api',
  password: process.env.PASSWORD,
ssl: 'true'
});
// Connect to the database
pool.connect((err, client) => {
  if (err) {
    console.log(err);
    return;
  }
    stuff(client);
});

async function stuff(client){
statsw = await getData("week", "stats", client);
games = await getData("alltime", "games", client);
gamesw = await getData("week", "games", client);
stats = await getData("alltime", "stats", client);
otherstuff = await getData("other", "stats", client);
console.log(stats);
    console.log(games);
        console.log(otherstuff);

    

console.log(day);
storedDay = otherstuff[0]
console.log(storedDay + ", " + day);
if(storedDay != day){
    if(day < storedDay && day >= 0){
        console.log("reseting week");
        gamesw = [];
        statsw = [];
        writeCollumn("week", gamesw, statsw, client);
        otherstuff[0] = day;
        console.log("popular this week reset");
    }
}
replaceStat("other", "day", day, client);
io.on("connection", function (socket) {
    socket.on("game", function(data) {
        if(games.includes(data)){
            stats[games.indexOf(data)] +=1;
            replaceStat("alltime", data, stats[games.indexOf(data)], client);
        }else{
            games.push(data);
            stats.push(1);
            addPair("alltime", data, 1, client);
        }
        if(gamesw.includes(data)){
            statsw[gamesw.indexOf(data)] +=1;
            replaceStat("week", data, statsw[gamesw.indexOf(data)], client);
        }else{
            gamesw.push(data);
            statsw.push(1);
            addPair("week", data, 1, client);
        }
        console.log("added 1 to the stat of " + data + " to get a result of " + stats[games.indexOf(data)]);
    });
    socket.on("get", function(data) {
        if(games.length < 10){
                    console.log("not enough data for popgames");
        }else{
        gameStatPairs = games.map((name, index) => ({ name, number: stats[index] }));
        gameStatPairs.sort((a, b) => b.number - a.number);
        sortedGames = gameStatPairs.map((pair) => pair.name);
        io.emit("popgames", sortedGames.slice(0,10));
        console.log(sortedGames);
                }
        if(gamesw.length < 10){
                console.log("not enough data for popwgames");
        }else{
        gameStatPairs = gamesw.map((name, index) => ({ name, number: statsw[index] }));
        gameStatPairs.sort((a, b) => b.number - a.number);
        sortedGames = gameStatPairs.map((pair) => pair.name);
        io.emit("popwgames", sortedGames.slice(0,10));
        }
    });
});


http.listen(3000, function() {
  console.log('listening on 3000');
});
}
async function getData(dataBaseName, collmnName, client){
     const data = await client.query('SELECT ' + collmnName + ' FROM ' + dataBaseName + ';');
    if(collmnName == "games"){
     return data.rows.map(row => row.games);
    }else{
             return data.rows.map(row => row.stats);

    }

}
async function writeCollmn(dataBaseName, games, stats, client){
    var convertedGames = [];
    games.forEach((game, index) => {
    convertedGames.push("('" + game + "', " + stats[index] + ")")
    });
    var commandToDo = "";
    commandToDo += "BEGIN;";
    commandToDo += "DELETE FROM " + dataBaseName + ";";
    commandToDo += 'INSERT INTO ' + dataBaseName + ' (games, stats) VALUES ' + convertedGames.toString() + ';'
    commandToDo += "COMMIT;";
    console.log(commandToDo);
    return await client.query(commandToDo);
}
async function replaceStat(dataBaseName, game, newvalue, client){
    var commandToDo = "";
    commandToDo += 'UPDATE ' + dataBaseName + ' SET stats = ' + newvalue + " WHERE games = '" + game + "';";
    console.log(commandToDo);
    return await client.query(commandToDo);
}
async function addPair(dataBaseName, game, stat, client){
    var commandToDo = "";
    commandToDo += 'INSERT INTO ' + dataBaseName + " (games, stats) VALUES ('" + game + "', " + stat + ");";
    console.log(commandToDo);
    return await client.query(commandToDo);
}