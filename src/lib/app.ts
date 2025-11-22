import { Errors } from 'cs544-js-utils';

//types defined in library.ts in earlier projects
import * as Lib from 'library-types';


import { NavLinks, LinkedResult, PagedEnvelope, SuccessEnvelope }
  from './response-envelopes.js';

import { makeLibraryWs, LibraryWs } from './library-ws.js';

import { makeElement, makeQueryUrl } from './utils.js';

export default function makeApp(wsUrl: string) {
  return new App(wsUrl);
}


class App {
  private readonly wsUrl: string;
  private readonly ws: LibraryWs;

  private readonly result: HTMLElement;
  private readonly errors: HTMLElement;
  private readonly search: HTMLInputElement;


  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
    this.ws = makeLibraryWs(wsUrl);
    this.result = document.querySelector('#result');
    this.errors = document.querySelector('#errors');
    //TODO: add search handler
    this.search = document.querySelector<HTMLInputElement>('#search')!;
    this.search.addEventListener('blur', () => {
    this.handleSearchBlur();
  });
  }
  
  //TODO: add private methods as needed
  // TODO: clear errors, validate input, build URL, call this.loadSearchResults(url)
  private async handleSearchBlur(): Promise<void> {
    this.clearErrors();
    const query = this.search.value.trim();

    // If nothing to search, clear results and stop
  if (query.length === 0) {
    this.result.innerHTML = '';
    return;
  }

  // Build URL:  {wsUrl}/books?search={query}
  const url = makeQueryUrl(`${this.wsUrl}/books`, { search: query });

  await this.loadSearchResults(url);
}

// TODO: call ws.findBooksByUrl and render results
private async loadSearchResults(url: URL | string): Promise<void> {
  this.clearErrors();
  this.result.innerHTML = '';

  // Call web service
  const result = await this.ws.findBooksByUrl(url);

  // unwrap will show errors if any; if error, just stop
  const envelope = this.unwrap<PagedEnvelope<Lib.XBook>>(result);
  if (!envelope) {
    return;
  }

  this.renderSearchResults(envelope);
}

// TODO  render UL of books + prev/next controls
private renderSearchResults(env: PagedEnvelope<Lib.XBook>): void {
  this.result.innerHTML = '';
  const ul = makeElement('ul', { id: 'search-results' });

  for (const item of env.result) {
    const book = item.result;

    const li = makeElement('li');
    const titleSpan = makeElement('span', { class: 'content' }, book.title);
    const detailsLink = makeElement('a', { href: '#', class: 'details' }, 'details...');

    // When user clicks "details..." show that book's details
    detailsLink.addEventListener('click', (evt) => {
      evt.preventDefault();
      this.showBookDetails(item.links.self.href);
    });

    li.append(titleSpan, detailsLink);
    ul.append(li);
  }
const navDiv = makeElement('div', { id: 'search-nav' });

  if (env.links.prev) {
    const prevLink = makeElement(
      'a',
      { href: '#', rel: 'prev', class: 'scroll-prev' },
      '« prev'
    );
    prevLink.addEventListener('click', (evt) => {
      evt.preventDefault();
      this.loadSearchResults(env.links.prev!.href);
    });
    navDiv.append(prevLink);
  }

  if (env.links.next) {
    const nextLink = makeElement(
      'a',
      { href: '#', rel: 'next', class: 'scroll-next' },
      'next »'
    );
    nextLink.addEventListener('click', (evt) => {
      evt.preventDefault();
      this.loadSearchResults(env.links.next!.href);
    });
    navDiv.append(nextLink);
  }

  // Attach list + nav to #result
  this.result.append(ul, navDiv);
}

private async showBookDetails(selfUrl: string): Promise<void> {
  this.clearErrors();
  this.result.innerHTML = '';

  const result = await this.ws.getBookByUrl(selfUrl);
  const env = this.unwrap<SuccessEnvelope<Lib.XBook>>(result);
  if (!env) {
    return;
  }

  const book = env.result;

  const dl = makeElement('dl', { class: 'book-details' });

  const addField = (label: string, value: unknown) => {
    dl.append(
      makeElement('dt', {}, label),
      makeElement('dd', {}, value != null ? String(value) : '')
    );
  };

  // These property names assume the usual XBook shape from previous projects
  addField('ISBN', (book as any).isbn);
  addField('Title', (book as any).title);
  addField(
    'Authors',
    (book as any).authors?.join
      ? (book as any).authors.join(', ')
      : (book as any).authors
  );
  addField('Publisher', (book as any).publisher);
  addField('Year', (book as any).year ?? (book as any).pubYear);
  addField('Copies', (book as any).copies ?? (book as any).numCopies);

  // Borrowers line – required by spec
  dl.append(
    makeElement('dt', {}, 'Borrowers'),
    makeElement('dd', { id: 'borrowers' }, 'None')
  );

  const container = makeElement('div', { id: 'book-details' }, dl);
  
  const form = makeElement('form', { id: 'checkout-form' }) as HTMLFormElement;

  const label = makeElement('label', {}, 'Patron ID: ');
  const patronInput = makeElement('input', {
    id: 'patronId',
    name: 'patronId',
    type: 'text',
  }) as HTMLInputElement;

  const patronError = makeElement('span', {
    id: 'patronId-error',
    class: 'error',
  });

  label.append(patronInput);
  const submitBtn = makeElement('button', { type: 'submit' }, 'Check Out');

  form.append(label, patronError, submitBtn);
  container.append(form);

  this.result.append(container);

  const isbn = (book as any).isbn as string;
  this.attachCheckoutHandler(isbn);
  await this.refreshBorrowers(isbn);

}

private attachCheckoutHandler(isbn: string): void {
  const form = document.querySelector<HTMLFormElement>('#checkout-form');
  if (!form) {
    return;
  }

  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    this.clearErrors();

    const patronInput =
      document.querySelector<HTMLInputElement>('#patronId');
    const patronError =
      document.querySelector<HTMLElement>('#patronId-error');

    if (patronError) {
      patronError.textContent = '';
    }

    if (!patronInput) {
      return;
    }

    const patronId = patronInput.value.trim();

    if (!patronId) {
      if (patronError) {
        patronError.textContent = 'Patron ID is required';
      }
      return;
    }

    const lend: Lib.Lend = {
      isbn,
      patronId,
    } as Lib.Lend;

    const result = await this.ws.checkoutBook(lend);
    if (!result.isOk) {
      this.unwrap<void>(result);
      return;
    }

    patronInput.value = '';
    await this.refreshBorrowers(isbn);
  });
}


private async refreshBorrowers(isbn: string): Promise<void> {
  const borrowersDd = document.querySelector<HTMLElement>('#borrowers');
  if (!borrowersDd) {
    return;
  }

  borrowersDd.textContent = 'Loading...';

  const result = await this.ws.getLends(isbn);
  const lends = this.unwrap<Lib.Lend[]>(result);
  if (!lends) {
    return;
  }

  if (lends.length === 0) {
    borrowersDd.textContent = 'None';
    return;
  }

  const ul = makeElement('ul');

  for (const lend of lends) {
    const li = makeElement('li');
    const patronSpan = makeElement(
      'span',
      { class: 'content' },
      String((lend as any).patronId)
    );

    const btn = makeElement(
      'button',
      { type: 'button', class: 'return-book' },
      'Return Book'
    );

    btn.addEventListener('click', async (evt) => {
      evt.preventDefault();
      this.clearErrors();

      const res = await this.ws.returnBook(lend);
      if (!res.isOk) {
        this.unwrap<void>(res);
        return;
      }

      await this.refreshBorrowers(isbn);
    });

    li.append(patronSpan, btn);
    ul.append(li);
  }

  borrowersDd.innerHTML = '';
  borrowersDd.append(ul);
}



  /** unwrap a result, displaying errors if !result.isOk, 
   *  returning T otherwise.   Use as if (unwrap(result)) { ... }
   *  when T !== void.
   */
  private unwrap<T>(result: Errors.Result<T>) {
    if (result.isOk === false) {
      displayErrors(result.errors);
    }
    else {
      return result.val;
    }
  }

  /** clear out all errors */
  private clearErrors() {
    this.errors.innerHTML = '';
    document.querySelectorAll(`.error`).forEach( el => {
      el.innerHTML = '';
    });
  }

} //class App

/** Display errors. If an error has a widget or path widgetId such
 *  that an element having ID `${widgetId}-error` exists,
 *  then the error message is added to that element; otherwise the
 *  error message is added to the element having to the element having
 *  ID `errors` wrapped within an `<li>`.
 */  
function displayErrors(errors: Errors.Err[]) {
  for (const err of errors) {
    const id = err.options.widget ?? err.options.path;
    const widget = id && document.querySelector(`#${id}-error`);
    if (widget) {
      widget.append(err.message);
    }
    else {
      const li = makeElement('li', {class: 'error'}, err.message);
      document.querySelector(`#errors`)!.append(li);
    }
  }
}

//TODO: add functions as needed
