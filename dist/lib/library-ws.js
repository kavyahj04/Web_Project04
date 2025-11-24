import { Errors } from 'cs544-js-utils';
export function makeLibraryWs(url) {
    return new LibraryWs(url);
}
export class LibraryWs {
    //base url for these web services
    url;
    constructor(url) { this.url = url; }
    /** given an absolute books url bookUrl ending with /books/api,
     *  return a SuccessEnvelope for the book identified by bookUrl.
     */
    async getBookByUrl(bookUrl) {
        const result = await getEnvelope(bookUrl);
        return result;
    }
    /** given an absolute url findUrl ending with /books with query
     *  parameters search and optional query parameters count and index,
     *  return a PagedEnvelope containing a list of matching books.
     */
    async findBooksByUrl(findUrl) {
        const result = await getEnvelope(findUrl);
        return result;
    }
    /** check out book specified by lend */
    //make a PUT request to /lendings
    async checkoutBook(lend) {
        try {
            const result = await fetch(`${this.url}/api/lendings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(lend)
            });
            if (!result.ok) {
                // Try to parse an error envelope; if parsing fails return a generic error
                try {
                    const text = await result.text();
                    if (text && text.length > 0) {
                        const response = JSON.parse(text);
                        return new Errors.ErrResult(response.errors);
                    }
                    return Errors.errResult(`PUT ${this.url}/api/lendings: ${result.status} ${result.statusText}`);
                }
                catch (err) {
                    console.error('Error parsing error response', err);
                    return Errors.errResult(`PUT ${this.url}/api/lendings: ${result.status} ${result.statusText}`);
                }
            }
            else {
                return Errors.VOID_RESULT;
            }
        }
        catch (err) {
            console.error(err);
            return Errors.errResult(`PUT ${this.url}/api/lendings: error ${err}`);
        }
    }
    /** return book specified by lend */
    //make a DELETE request to /lendings
    async returnBook(lend) {
        try {
            console.log(`url is ${this.url}/api/lendings`);
            const result = await fetch(`${this.url}/api/lendings`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(lend)
            });
            if (!result.ok) {
                // Try to parse an error envelope; if parsing fails return a generic error
                try {
                    const text = await result.text();
                    if (text && text.length > 0) {
                        const response = JSON.parse(text);
                        return new Errors.ErrResult(response.errors);
                    }
                    return Errors.errResult(`DELETE ${this.url}/api/lendings: ${result.status} ${result.statusText}`);
                }
                catch (err) {
                    console.error('Error parsing error response', err);
                    return Errors.errResult(`DELETE ${this.url}/api/lendings: ${result.status} ${result.statusText}`);
                }
            }
            else {
                return Errors.VOID_RESULT;
            }
        }
        catch (err) {
            console.error(err);
            return Errors.errResult(`DELETE ${this.url}/api/lendings: error ${err}`);
        }
    }
    /** return Lend[] of all lendings for isbn. */
    //make a GET request to /lendings with query-params set
    //to { findBy: 'isbn', isbn }.
    async getLends(isbn) {
        //doing a GET to /api/lendings with query parameters set to { findBy: 'isbn', isbn }
        try {
            const result = await fetch(`${this.url}/api/lendings/?findBy=isbn&isbn=${isbn}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (!result.ok) {
                // Try to parse an error envelope; if parsing fails return a generic error
                try {
                    const text = await result.text();
                    if (text && text.length > 0) {
                        const response = JSON.parse(text);
                        return new Errors.ErrResult(response.errors);
                    }
                    return Errors.errResult(`GET ${this.url}/api/lendings: ${result.status} ${result.statusText}`);
                }
                catch (err) {
                    console.error('Error parsing error response', err);
                    return Errors.errResult(`GET ${this.url}/api/lendings: ${result.status} ${result.statusText}`);
                }
            }
            else {
                return Errors.okResult(await result.json());
            }
        }
        catch (err) {
            console.error(err);
            return Errors.errResult(`PUT ${this.url}/api/lendings: error ${err}`);
        }
    }
}
/** Return either a SuccessEnvelope<T> or PagedEnvelope<T> wrapped
 *  within a Errors.Result.  Note that the caller needs to instantiate
 *  both type parameters appropriately.
 */
async function getEnvelope(url) {
    const result = await fetchJson(url);
    if (result.isOk === true) {
        const response = result.val;
        if (response.isOk === true) {
            return Errors.okResult(response);
        }
        else
            return new Errors.ErrResult(response.errors);
    }
    else {
        return result;
    }
}
const DEFAULT_FETCH = { method: 'GET', };
/** send a request to url, converting any exceptions to an
 *  error result.
 */
async function fetchJson(url, options = DEFAULT_FETCH) {
    //<https://github.com/microsoft/TypeScript/blob/main/src/lib/dom.generated.d.ts#L26104>
    try {
        const response = await fetch(url, options);
        // Read raw text first so we can handle empty or non-JSON responses
        const text = await response.text();
        // No body
        if (!text || text.length === 0) {
            if (response.ok) {
                // successful response with empty body
                return Errors.okResult(undefined);
            }
            return Errors.errResult(`${options.method} ${url}: ${response.status} ${response.statusText}`);
        }
        // Try to parse JSON; if parsing fails return a useful error instead of throwing
        try {
            const json = JSON.parse(text);
            return Errors.okResult(json);
        }
        catch (err) {
            console.error('JSON parse error', err, 'response text:', text);
            return Errors.errResult(`${options.method} ${url}: error parsing JSON: ${err}`);
        }
    }
    catch (err) {
        console.error(err);
        return Errors.errResult(`${options.method} ${url}: error ${err}`);
    }
}
//TODO: add other functions as needed
//# sourceMappingURL=library-ws.js.map