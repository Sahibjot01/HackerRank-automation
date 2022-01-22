//simple automation script to create contest on hackerrank
//node .\script.js --url="https://www.hackerrank.com"
let minimist = require("minimist");
let puppeteer = require("puppeteer");
let fs = require("fs");
const { PageEmbeddingMismatchedContextError } = require("pdf-lib");
const { checkPrime } = require("crypto");
const { ADDRGETNETWORKPARAMS } = require("dns");

let args = minimist(process.argv);
console.log(args.url);
let detailsJSON = fs.readFileSync("login.json","utf-8");
let credential = JSON.parse(detailsJSON);
main();

async function main(){
    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args : [
            '--start-maximized'
        ]
    });
    let pages = await browser.pages();
    let page = pages[0];
    await page.goto(args.url);
    // wait and then click on login on page1
    await page.waitForSelector("a[data-event-action='Login']");
    await page.click("a[data-event-action='Login']");
    // wait and then click on login on page2
    await page.waitForSelector("a[href='https://www.hackerrank.com/login']");
    await page.click("a[href='https://www.hackerrank.com/login']");
    // enter username and password
    await page.waitForSelector("input[name='username']");
    await page.type("input[name='username']",credential.username,{delay:20});
    await page.type("input[type='password']",credential.password,{delay:20});

    await page.waitForSelector("button[data-analytics='LoginPassword']");
    await page.click("button[data-analytics='LoginPassword']");

    await page.waitForSelector("a[data-analytics='NavBarContests']");
    await page.click("a[data-analytics='NavBarContests']");

    await page.waitForSelector(".administration-link a.text-link");

    let creation_URL = await page.evaluate(()=>{
        // return  document.querySelectorAll(".administration-link a.text-link")[0].getAttribute("href");
        return  document.querySelectorAll(".administration-link a.text-link")[0].getAttribute("href");
    });
    let contestURL = [];
    for(let i = 0; i<credential.total_contest.length; i++){
        let newPage = await browser.newPage();
        url = await create_contest(newPage,credential.total_contest[i],args.url + creation_URL);
        contestURL.push(url);
        await newPage.close();
    }
    let raw = "";
    for(let i = 0; i<contestURL.length; i++){
        let text = "Contest " + (i+1) + " url :- " + contestURL[i];   
        raw += text + "\n";
    }
    fs.writeFileSync("url.txt",raw);
    // await page.waitForSelector(".username");
    // await page.click(".username",{delay : 500});
    await page.close()
    await browser.close();
};

async function create_contest(page,details,url){
    await page.goto(url);
    await page.bringToFront();
    await page.waitForSelector("input[data-analytics='CreateContestName']");
    await page.type("input[data-analytics='CreateContestName']",details.c_name, {delay:20});

    await page.waitForSelector("input[data-analytics='CreateContestStartDate']");
    await page.type("input[data-analytics='CreateContestStartDate']",details.s_date, {delay:20});

    await page.waitForSelector("#starttime");
    await page.type("#starttime",details.s_time, {delay:20});
    if(details.noEndTime == false){
        await page.waitForSelector("input[data-analytics='CreateContestEndDate']");
        await page.type("input[data-analytics='CreateContestEndDate']",details.e_date, {delay:20});
        
        await page.waitForSelector("#endtime");
        await page.type("#endtime",details.e_time, {delay:20});
    }else{
        await page.waitForSelector(".iCheck-helper");
        await page.evaluate(()=>{
            document.querySelectorAll(".iCheck-helper")[0].click();
        })
    }
    await page.waitForSelector(".pull-left.lightweight.pjT.psB")
    await page.click(".pull-left.lightweight.pjT.psB")

    await page.waitForSelector(".select2-choice");
    await page.click(".select2-choice",{delay:500});
    await page.click(".select2-choice",{delay:500});

    await page.waitForSelector(".select2-result-label");
    let path = '//div[@class="select2-result-label"][contains(text(),"'+ details.organization_type + '")]';
    // console.log(path);
    //need a path like this div[@class="select2-result-label"][contains(text(),"Bootcamp")]
    //not like this div[@class="select2-result-label"][contains(text(),Bootcamp)] 
    //look at inverted comma's at bootcamp 
    const choice = await page.$x(path)
    // console.log(choice.length);
    if(choice.length>0){
        await choice[0].click()
    }
    //if organizattion type is company or school then there is dropdown in 
    if(details.organization_type == "Company" || details.organization_type == "School"){
        await page.waitForSelector(".select2-container.required");
        await page.click(".select2-container.required");
        await page.waitForSelector("#select2-drop input");
        await page.type("#select2-drop input",details.organization_name,{delay:20});
        let path2 = '//div[@class="college-title pull-left"][contains(text(),"' + details.organization_name +'")]';
        await page.waitForSelector(".college-title.pull-left");
        let choiceForDropdown2 = await page.$x(path2);
        if(choiceForDropdown2.length>0){
            await choiceForDropdown2[0].click();
        }else{
            await page.waitForSelector(".select2-no-results");
            await page.click(".select2-no-results");
        }
    }else{
        await page.waitForSelector("#organization_name");
        await page.type("#organization_name",details.organization_name,{delay:20});
    }
    await page.waitFor(3000);
    await page.waitForSelector("button[data-analytics='CreateContestButton']");
    await page.click("button[data-analytics='CreateContestButton']");
    await page.waitForSelector("model-slug.clearfix.pull-left.pjB");
    let cURL = await page.evaluate(()=>{
        return document.querySelector(".model-slug.clearfix.pull-left.pjB").innerText;
    })

    await page.waitFor(3000);
    await assignMods(page,details.mod);
    await page.waitFor(1000);
    return cURL;
}

async function assignMods(page,modList){
    if(modList.length == 0)
        return;
    await page.waitForSelector("li[data-tab='moderators']");
    await page.click("li[data-tab='moderators']");

    await page.waitForSelector("#moderator");
    await page.click("#moderator");
    for(let i = 0; i<modList.length; i++){
        await page.type("#moderator",modList[i],{delay:20});
        await page.keyboard.press('Enter');
    }
}

