# HorsesData
Functions for scraping data about horse races when you are logged in.

Function is gathering data and displaying them on route /getHorseData. Parameters for function call are hardcoded, dynamic gathering is implemented and commented.
Needed parameters are date, venue and name. Date must contain date and time. Venue is name of venue. Name is horse name.
Cookies for automatised login are stored in cookies.json file.

We have 4 asynchronous functions. 
Main function is getAllAboutHorse. In this function is puppeteer connection made, logIn function is called if there is no old cookies, getUrl function is called next. Function getUrl takes known parameters and scrap basic site for finding concrete url where are results important for us. Next function to call is getHorsesData which scrap data from wanted site and give us all data about race. Finally we are going trough the data and looking for wanted horse. At the end data are send back.

On the bottom of the index.js file is commented section. This section can be used for command line call.
