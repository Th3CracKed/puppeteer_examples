import puppeteer from 'puppeteer-extra';

// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import REPLPlugin from 'puppeteer-extra-plugin-repl';
import { Page } from 'puppeteer';
import fs from "fs";

(async function () {
    performance.mark('mark-start');
    puppeteer.use(StealthPlugin())
    puppeteer.use(REPLPlugin())
    // puppeteer usage as normal
    const browser = await puppeteer.launch({ headless: false, devtools: true })
    const page = await browser.newPage();

    // await getAmazonPrice(page, 'https://www.amazon.fr/Hands-Machine-Learning-Scikit-learn-Tensorflow/dp/1492032646/');
    // await googleSearch(page, 'Machine learning');
    // await downloadImage(page, "Machine Learning")
    await googleSearchSuggestion(page, 'Machine learning');
    // Start an interactive REPL here with the `page` instance.
    // uncomment to better dev experience
    await page.repl();
    // await browser.repl();
    performance.mark('mark-end')
    performance.measure('benchmark', 'mark-start', 'mark-end')
    console.log(performance.getEntriesByName('benchmark')[0].duration);
}())

async function getAmazonPrice(page: Page, url: string) {
    await page.goto(url);
    const price = await page.evaluate(() => document.getElementById("price").innerHTML);
    console.log(price.replace("&nbsp;", " "));
}

async function googleSearch(page: Page, searchTerm: string) {
    const url = `https://www.google.com/search?q=${searchTerm}&hl=en`;
    try {
        console.log(`Visiting ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        console.log(`${url} loaded Successfully`);
        await acceptTerms(page);
        const links = await page.$$eval('.yuRUbf', (extractedElements) => extractedElements.map(extractedElement => (<any>extractedElement.firstChild).href))
        // const links = await page.evaluate(() => {
        //     const array = document.getElementsByClassName('yuRUbf');
        //     const result = [];
        //     for (let i = 0; i < array.length; i++) {
        //         result.push((<any>array[i].firstChild).href);
        //     }
        //     return result;
        // });
        console.log(links);
    } catch (err) {
        console.log(err);
        await page.screenshot({ path: `./results/google_debug.jpg`, type: 'jpeg' });
    }
}

async function downloadImage(page: Page, searchTerm: string, numOfImages = 5) {
    await page.goto(`https://www.google.com/search?q=${searchTerm}&tbm=isch&hl=en`, { waitUntil: 'networkidle0' });
    const images = await page.$$eval('a>div>img', as => as.map((a: any) => a.src));;
    console.log(images);
    for (let index = 0; index < numOfImages; index++) {
        const base64Data = images?.[index]?.replace("data:image/jpeg;base64", "").replace("data:image/png;base64", "");
        const buffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(`results/${searchTerm}_${index}.png`, buffer);
    }
    await page.waitForTimeout(10000)
    await page.close();
}

async function googleSearchSuggestion(page: Page, searchTerm: string) {
    await page.goto(`https://www.google.com/?hl=en`, { waitUntil: 'networkidle0' });
    await acceptTerms(page);

    console.log('Waiting for search Input Button');
    await page.waitForSelector('input[role="combobox"]');
    console.log('Search Input found');
    console.log('Trying to type on search box...');
    await page.type('input[role="combobox"]', searchTerm);
    await page.click('input[role="combobox"]');
    console.log('Done');

    console.log('Listening to requests');
    page.on('request', async (request, args) => {
        if (request.url().includes('/complete/search') && request.method() === 'GET') {
            await page.waitForSelector('div[role="option"]');
            await page.waitForTimeout(1000);
            console.log('evaluation...')
            const suggestions = await page.$$eval('div[role="option"]', options => options.map(option => option.textContent));
            console.log(suggestions);
        }
    })
}

async function acceptTerms(page: Page) {
    try {
        console.log('Waiting for agree Button');
        await page.waitForSelector('button>div');
        const elements = await page.$$('button>div');
        console.log('Searching for agree Button');
        let agreeButton;
        for await (const element of elements) {
            const isAgreeButton = element.evaluate(el => el.textContent === 'I agree');
            if (isAgreeButton) {
                agreeButton = element;
            }
        }
        if (agreeButton) {
            console.log('Agree Button found');
        } else {
            console.log('Agree Button not found');
        }
        console.log('clicking on agree button');
        await page.waitForTimeout(2000);
        await agreeButton?.click();
        console.log('Agree button clicked');
    } catch (err) {
        console.log(err, 'No selector found for agree button');
    }
}

