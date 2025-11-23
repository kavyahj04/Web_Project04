import { Errors } from 'cs544-js-utils';

import { SuccessEnvelope, PagedEnvelope, ErrorEnvelope }
  from './response-envelopes.js';
import * as Lib from 'library-types';

import * as Utils from './utils.js';


type NonPagedResult<T> = SuccessEnvelope<T> | ErrorEnvelope;
type PagedResult<T> = PagedEnvelope<T> | ErrorEnvelope;

export function makeLibraryWs(url: string) {
  return new LibraryWs(url);
}

export class LibraryWs {
  //base url for these web services
  private url;

  constructor(url: string) { this.url = url; }

  /** given an absolute books url bookUrl ending with /books/api,
   *  return a SuccessEnvelope for the book identified by bookUrl.
   */
  async getBookByUrl(bookUrl: URL|string)
    : Promise<Errors.Result<SuccessEnvelope<Lib.XBook>>>
  {
    console.log(`Getting book by URL: ${bookUrl}`);
    const result = await getEnvelope<Lib.XBook, SuccessEnvelope<Lib.XBook>>(bookUrl);
    return result;
  }
  /** given an absolute url findUrl ending with /books with query
   *  parameters search and optional query parameters count and index,
   *  return a PagedEnvelope containing a list of matching books.
   */
  async findBooksByUrl(findUrl: URL|string)
    : Promise<Errors.Result<PagedEnvelope<Lib.XBook>>>
  {
    const result = await getEnvelope<Lib.XBook, PagedEnvelope<Lib.XBook>>(findUrl);
    return result;
  }

  /** check out book specified by lend */
  //make a PUT request to /lendings
  async checkoutBook(lend: Lib.Lend) : Promise<Errors.Result<void>> {
    try{
      console.log(`url is ${this.url}/api/lendings`);
       const result = await fetch(`${this.url}/api/lendings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lend)
    });
    if (!result.ok){
      // Try to parse an error envelope; if parsing fails return a generic error
      try {
        const text = await result.text();
        if (text && text.length > 0) {
          const response = JSON.parse(text) as ErrorEnvelope;
          return new Errors.ErrResult(response.errors as Errors.Err[]);
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
  } catch (err) {
    console.error(err);
    return Errors.errResult(`PUT ${this.url}/api/lendings: error ${err}`);
  }

  }

  /** return book specified by lend */
  //make a DELETE request to /lendings
  async returnBook(lend: Lib.Lend) : Promise<Errors.Result<void>> {
    return Errors.errResult('TODO');
  }

  /** return Lend[] of all lendings for isbn. */
  //make a GET request to /lendings with query-params set
  //to { findBy: 'isbn', isbn }.
  async getLends(isbn: string) : Promise<Errors.Result<Lib.Lend[]>> {
    //doing a GET to /api/lendings with query parameters set to { findBy: 'isbn', isbn }
    try{
      console.log(`url is ${this.url}/api/lendings/?`);
       const result = await fetch(`${this.url}/api/lendings/?findBy=isbn&isbn=${isbn}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!result.ok){
      // Try to parse an error envelope; if parsing fails return a generic error
      try {
        const text = await result.text();
        if (text && text.length > 0) {
          const response = JSON.parse(text) as ErrorEnvelope;
          return new Errors.ErrResult(response.errors as Errors.Err[]);
        }
        return Errors.errResult(`GET ${this.url}/api/lendings: ${result.status} ${result.statusText}`);
      }
      catch (err) {
        console.error('Error parsing error response', err);
        return Errors.errResult(`GET ${this.url}/api/lendings: ${result.status} ${result.statusText}`);
      }
    }
    else {
      return Errors.okResult(await result.json() as Lib.Lend[]);
    }
  } catch (err) {
    console.error(err);
    return Errors.errResult(`PUT ${this.url}/api/lendings: error ${err}`);
  }

  }


}

/** Return either a SuccessEnvelope<T> or PagedEnvelope<T> wrapped 
 *  within a Errors.Result.  Note that the caller needs to instantiate
 *  both type parameters appropriately.
 */
async function getEnvelope<T, T1 extends SuccessEnvelope<T>|PagedEnvelope<T>>
  (url: URL|string)
  : Promise<Errors.Result<T1>>
{
  const result = await fetchJson<T1|ErrorEnvelope>(url);
  if (result.isOk === true) {
    const response = result.val;
    if (response.isOk === true) {
      return Errors.okResult(response);
    }
    else 
      return new Errors.ErrResult(response.errors as Errors.Err[]);
  }
  else {
    return result as Errors.Result<T1>;
  }
}

const DEFAULT_FETCH = { method: 'GET', };

/** send a request to url, converting any exceptions to an 
 *  error result.
 */
async function
  fetchJson<T>(url: URL|string,  options: RequestInit = DEFAULT_FETCH)
  : Promise<Errors.Result<T>> 
{
    //<https://github.com/microsoft/TypeScript/blob/main/src/lib/dom.generated.d.ts#L26104>
  try {
    const response = await fetch(url, options);

    // Read raw text first so we can handle empty or non-JSON responses
    const text = await response.text();

    // No body
    if (!text || text.length === 0) {
      if (response.ok) {
        // successful response with empty body
        return Errors.okResult((undefined as unknown) as T);
      }
      return Errors.errResult(`${options.method} ${url}: ${response.status} ${response.statusText}`);
    }

    // Try to parse JSON; if parsing fails return a useful error instead of throwing
    try {
      const json = JSON.parse(text) as T;
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
