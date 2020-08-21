const puppeteer = require('puppeteer');
const moment = require('moment');
const capitalize = require('capitalize');

const express = require("express");
const app = express();
const cors = require("cors");
const port = 4000;
const bodyParser = require("body-parser");

app.use(cors());
app.listen(port);
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.status(200).send("OK");
});
app.get('/getPosition', async (req, res) => {
    try {
        let raceDate = '2020-08-18 17:20';//req.body.date;
        let raceVenue = 'Fontwell Park';//req.body.venue;
        let horseName = 'Gold Mountain';//req.body.name; 'Auld Sod' 1. 'Gold Mountain' 6. 'Thomas Blossom' NR
        let data = await getAllAboutHorse(raceDate, raceVenue, horseName);
        res.status(200).send(JSON.stringify(data));
    } catch (error) {
        res.status(404).send(error.message);
        return;
    }
});

async  function logIn(page){
    let url = 'https://www.timeform.com/horse-racing/account/sign-in';
    let email = 'n.mitic97@gmail.com';
    let password = 'secret';
    await page.goto(url);
    // Login
    await page.type('#EmailAddress', email);
    await page.type('#Password', password);
    await page.click('#RememberMe');
    await page.click('.submit-button');
    await page.waitForNavigation();

    // Get cookies
    const cookies = await page.cookies();
    const fs = require('fs').promises;
    await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2));
}

async function getUrl(page, baseUrl, venue, date, time) {
    await page.goto(`${baseUrl}${date}`);
    const concreteUrl = await page.evaluate((venue, time) => {
        let url = '';
        let id = `${venue}-results`;
        let allMatchesForVenue = document.querySelectorAll(`#${id}`);
        allMatchesForVenue = Array.from(allMatchesForVenue[0].children);
        allMatchesForVenue.forEach(singleMatch => {
            if (singleMatch.querySelector('.results-time').innerText === time) {
                url = singleMatch.querySelector('.results-title').href;
            }
        });
        return url;
    }, venue, time);
    return concreteUrl;
}

async function getHorsesData(page, finalUrl) {
    await page.goto(finalUrl);
    const resultsList = await page.evaluate(() => {
        let horsesData = [];

        /*find possible non runners*/
        let nonRunners = document
            .querySelector('[title= "Horses pulled out after the overnight declaration stage"]')
            .innerText;
        if (nonRunners.substring(0, 3) != "All") {
            nonRunners = nonRunners.replace('Non Runners: ', "");
            let horses = nonRunners.split(",");
            horses.forEach(horse => {
                horsesData.push({
                    'position': -1,
                    'name': horse.replace(/(\(.*|\.)/gm, "").trim().toUpperCase(),
                });
            });
        }

        /*find runners and their positions*/
        const horses = document.querySelectorAll('#ReportBody .rp-table-row');
        horses.forEach(singleHorse => {
            horsesData.push({
                'position': singleHorse.querySelector('.rp-entry-number').innerText.trim(),
                'name': singleHorse.querySelector('.rp-horse').innerText
                    .trim().replace(/(\r\n|\n|\r)/gm, "")
                    .trim().replace(/([0-9]|\.)/gm, "")
                    .trim().replace(/\(.*\)/, "")
                    .trim().toUpperCase(),
                'bsp': singleHorse.querySelector('[title= "Betfair Win SP"]').innerText.trim(),
                'place': singleHorse.querySelector('[title= "Betfair Place SP"]').innerText
                    .trim().replace(/\(|\)/gm, "")
            });
        });
        return horsesData;
    })
    return resultsList;
}

async function getAllAboutHorse(raceDate, raceVenue, horseName) {
    //variables for generating url
    let baseUrl = 'https://www.timeform.com/horse-racing/results/';

    if (!moment(raceDate).isValid()) {
        console.log("invalid date");
        return;
    }
    let date = moment(raceDate).format('YYYY-MM-DD');
    let time = moment(raceDate).format('HH:mm');
    let venue = raceVenue.toLowerCase().replace(" ", "-");
    let finalUrl = '';
    //variables for data about horses
    let horse = horseName.toUpperCase();
    let dataOfAllHorses;
    let dataOfWantedHorse;

    //launching puppeteer
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized'],
        //stealth: true
    });
    const page = await browser.newPage();

    const fs = require('fs').promises;
    const cookiesString = await fs.readFile('./cookies.json');
    const cookies = JSON.parse(cookiesString);
    if(cookies.length != 0){
        await page.setCookie(...cookies);
    }else{
        await logIn(page);
    }

    finalUrl = await getUrl(page, baseUrl, venue, date, time);
    dataOfAllHorses = await getHorsesData(page, finalUrl);
    await browser.close();

    //looking for wanted horse
    for (let i = 0; i < dataOfAllHorses.length; i++) {
        let concreteHorse = dataOfAllHorses[i];
        if (concreteHorse.name === horse)
            dataOfWantedHorse = concreteHorse;
    }
    dataOfWantedHorse.name = capitalize.words(dataOfWantedHorse.name);
    if (dataOfWantedHorse.position === 0) {
        throw (new Error('There is no horse with that name!'));
    }
    return dataOfWantedHorse;
}

// (async () => {
//     //da se testira dal radi sa minimist
//     //const argv = require('minimist')(process.argv.slice(2));
//     // let date = argv.date;
//     // let venue = argv.venue;
//     // let horse = argv.horse;
//
//     let date = process.argv[2];
//     let venue = process.argv[3];
//     let horse = process.argv[4];
//     let pos = await getAllAboutHorse(date,venue,horse);
//     console.log(pos);
// })();

//naredba za pokretanje
//node index.js "2020-08-18 17:20" "Fontwell Park" "Auld Sod"
