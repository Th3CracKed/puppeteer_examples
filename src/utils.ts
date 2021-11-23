import { Page } from "puppeteer";

export async function getElement(page: Page, textToSearchFor: string, selector: string, containerSelector = 'body') {
    const container = await page.$(containerSelector);
    const links = await container.$$(selector);
    const element = await findAsync(links, async (link) => {
        const textContent = (await (await link.getProperty('textContent')).jsonValue());
        return typeof textContent === 'string' ? textContent.toLowerCase() === textToSearchFor : false;
    });
    return element;
}

export async function findAsync<T>(array: T[], predicate: (value: T, index?: number, obj?: T[]) => Promise<boolean>): Promise<T> {
    const candidates = await Promise.all(array.map(predicate));
    const index = candidates.findIndex(candidate => candidate);
    return array[index];
}