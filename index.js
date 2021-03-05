const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs");
const xl = require('excel4node');
const express = require("express");
const site = express();
site.set("view engine", "ejs")
const port = process.env.PORT || 985


site.get("/", (req, res) => {
    res.send("milesplit parser is here! [running from kubernetes]")
})

site.get("/:teamId", async (req, res) => {
    console.log("got request to get ",req.params.teamId)
    const teamId = req.params.teamId;
    if (teamId == "favicon.ico"){
        res.status(404).json({
            success: false
        })
        return;
    }
    const teamTimes = {};
    const athletesURL = `https://al.milesplit.com/api/v1/rosters?teamId=${teamId}&m=GET`;
    const scheduleURL = `https://al.milesplit.com/api/v1/teams/${teamId}/schedules?m=GET&season=cc&year=2020`;
    const athletesReq = await fetch(athletesURL);
    const athletes = await athletesReq.json();
    const scheduleReq = await fetch(scheduleURL);
    const schedule = await scheduleReq.json();

    async function finishedProcessing(){
        res.render("results", {
            team: schedule,
            athletes: athletes,
            results: teamTimes
        })
    }

    async function processResults(meet, results, cb){
        const contestents = results.data;
        contestents.forEach(async contestent => {
            if (contestent.teamName == schedule._embedded.team.name){

                if (teamTimes[contestent.meetId] == undefined){
                    const meetC = JSON.parse(JSON.stringify(meet));
                    meetC.results = {girls: {}, boys: {}}
                    teamTimes[contestent.meetId] = meetC;
                }
                contestent.peopleInRace = contestents.length;

                if (contestent.gender == "M"){
                    teamTimes[contestent.meetId].results.boys[contestent.athleteId] = contestent;
                }else{
                    teamTimes[contestent.meetId].results.girls[contestent.athleteId] = contestent;
                }
            }
        })

        cb();
    }

    async function processMeet(meet, cb){
        //console.log(meet)
        const getIdReq = await fetch(meet.link+"/results");
        let statsId = [];
        if (getIdReq.url.includes("/formatted")){
            //thanks for making it-semi easy
            statsId.push(getIdReq.url.split("/")[getIdReq.url.split("/").length-2]);
        }else{
            //parse body for it

            const body = await getIdReq.text();
            const $ = cheerio.load(body);

            $("table.meetResultsList > tbody > tr > td > a").each((i, c) => {
                const url = $(c).attr('href');
                statsId.push(url.split("/")[url.split("/").length-2]);

            })
        }


        let onStat = 0;

        statsId.forEach(async raceId => {
            onStat=onStat+1;
            const resultsReq = await fetch(`https://al.milesplit.com/api/v1/meets/${meet.meetId}/performances?resultsId=${raceId}&fields=id,meetId,meetName,teamId,teamName,athleteId,firstName,lastName,gender,ageGroupName,gradYear,units,mark,place&teamScores=true&m=GET`)
            const raceResults = await resultsReq.json();
            let on = 0;

            processResults(meet, raceResults, () => {
                on=on+1;
                if (on == statsId.length && onStat == statsId.length){
                    cb();
                }
            })
        })

    }

    async function processMonths(cb){
        let monthsOn = 0;

        schedule.data.monthGroups.forEach(month => {
            monthsOn=monthsOn+1;
            let searchable = month.items.filter(a => a.hasResults == true);
            let on = 0;

            searchable.forEach(meet => {
                if (meet.hasResults){
                    processMeet(meet, () => {
                        on=on+1;
                        if (on == searchable.length && monthsOn == schedule.data.monthGroups.length){
                            cb();
                        }
                    })
                }
            })
        })
    }

    processMonths(() => {
        finishedProcessing()
    })
})


site.get("/test/:teamId", async (req, res) => {
    console.log("got request to get ",req.params.teamId)
    const teamId = req.params.teamId;
    if (teamId == "favicon.ico"){
        res.status(404).json({
            success: false
        })
        return;
    }
    const teamTimes = {};
    const athletesURL = `https://al.milesplit.com/api/v1/rosters?teamId=${teamId}&m=GET`;
    const scheduleURL = `https://al.milesplit.com/api/v1/teams/${teamId}/schedules?m=GET&season=cc&year=2020`;
    const athletesReq = await fetch(athletesURL);
    const athletes = await athletesReq.json();
    const scheduleReq = await fetch(scheduleURL);
    const schedule = await scheduleReq.json();

    async function finishedProcessing(){
        res.json({
            team: schedule,
            athletes: athletes,
            results: teamTimes
        })
    }

    async function processResults(meet, results, cb){
        const contestents = results.data;
        contestents.forEach(async contestent => {
            if (contestent.teamName == schedule._embedded.team.name){

                if (teamTimes[contestent.meetId] == undefined){
                    const meetC = JSON.parse(JSON.stringify(meet));
                    meetC.results = {girls: {}, boys: {}}
                    teamTimes[contestent.meetId] = meetC;
                }
                contestent.peopleInRace = contestents.length;

                if (contestent.gender == "M"){
                    teamTimes[contestent.meetId].results.boys[contestent.athleteId] = contestent;
                }else{
                    teamTimes[contestent.meetId].results.girls[contestent.athleteId] = contestent;
                }
            }
        })

        cb();
    }

    async function processMeet(meet, cb){
        //console.log(meet)
        const getIdReq = await fetch(meet.link+"/results");
        let statsId = [];
        if (getIdReq.url.includes("/formatted")){
            //thanks for making it-semi easy
            statsId.push(getIdReq.url.split("/")[getIdReq.url.split("/").length-2]);
        }else{
            //parse body for it

            const body = await getIdReq.text();
            const $ = cheerio.load(body);

            $("table.meetResultsList > tbody > tr > td > a").each((i, c) => {
                const url = $(c).attr('href');
                statsId.push(url.split("/")[url.split("/").length-2]);

            })
        }


        let onStat = 0;

        statsId.forEach(async raceId => {
            onStat=onStat+1;
            const resultsReq = await fetch(`https://al.milesplit.com/api/v1/meets/${meet.meetId}/performances?resultsId=${raceId}&fields=id,meetId,meetName,teamId,teamName,athleteId,firstName,lastName,gender,ageGroupName,gradYear,units,mark,place&teamScores=true&m=GET`)
            const raceResults = await resultsReq.json();
            let on = 0;

            processResults(meet, raceResults, () => {
                on=on+1;
                if (on == statsId.length && onStat == statsId.length){
                    cb();
                }
            })
        })

    }

    async function processMonths(cb){
        let monthsOn = 0;

        schedule.data.monthGroups.forEach(month => {
            monthsOn=monthsOn+1;
            let searchable = month.items.filter(a => a.hasResults == true);
            let on = 0;

            searchable.forEach(meet => {
                if (meet.hasResults){
                    processMeet(meet, () => {
                        on=on+1;
                        if (on == searchable.length && monthsOn == schedule.data.monthGroups.length){
                            cb();
                        }
                    })
                }
            })
        })
    }

    processMonths(() => {
        finishedProcessing()
    })
})

site.listen(port)
