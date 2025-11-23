import { makeLibraryWs } from './library-ws.js';
import { makeElement, makeQueryUrl } from './utils.js';
export default function makeApp(wsUrl) {
    return new App(wsUrl);
}
class App {
    wsUrl;
    ws;
    result;
    errors;
    search;
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = makeLibraryWs(wsUrl);
        this.result = document.querySelector('#result');
        this.errors = document.querySelector('#errors');
        //TODO: add search handler
        this.search = document.querySelector('#search');
        this.search.addEventListener('blur', () => {
            this.handleSearchBlur();
        });
    }
    //TODO: add private methods as needed
    // TODO: clear errors, validate input, build URL, call this.loadSearchResults(url)
    async handleSearchBlur() {
        this.clearErrors();
        const query = this.search.value.trim();
        // If nothing to search, clear results and stop
        if (query.length === 0) {
            this.result.innerHTML = '';
            return;
        }
        // Build URL:  {wsUrl}/books?search={query}
        const url = makeQueryUrl(`${this.wsUrl}/api/books`, { search: query });
        console.log(`Searching for books with URL: ${url}`);
        await this.loadSearchResults(url);
    }
    // TODO: call ws.findBooksByUrl and render results
    async loadSearchResults(url) {
        this.clearErrors();
        this.result.innerHTML = '';
        // Call web service
        const result = await this.ws.findBooksByUrl(url);
        // unwrap will show errors if any; if error, just stop
        const envelope = this.unwrap(result);
        if (!envelope) {
            return;
        }
        this.renderSearchResults(envelope);
    }
    // TODO  render UL of books + prev/next controls
    renderSearchResults(env) {
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
                // Convert relative href to absolute URL using wsUrl as base
                const absoluteUrl = new URL(item.links.self.href, this.wsUrl).href;
                this.showBookDetails(absoluteUrl);
            });
            li.append(titleSpan, detailsLink);
            ul.append(li);
        }
        const navDiv = makeElement('div', { id: 'search-nav', class: 'scroll' });
        const beginScroll = makeElement('div', { class: 'scroll' });
        if (env.links.prev) {
            const prevLink = makeElement('a', { href: '#', rel: 'prev', class: 'scroll-prev' }, '« prev');
            prevLink.addEventListener('click', (evt) => {
                evt.preventDefault();
                // Convert relative href to absolute URL using wsUrl as base
                const absoluteUrl = new URL(env.links.prev.href, this.wsUrl).href;
                this.loadSearchResults(absoluteUrl);
            });
            navDiv.append(prevLink);
        }
        if (env.links.next) {
            const nextLink = makeElement('a', { href: '#', rel: 'next', class: 'scroll-next' }, 'next »');
            nextLink.addEventListener('click', (evt) => {
                evt.preventDefault();
                // Convert relative href to absolute URL using wsUrl as base
                const absoluteUrl = new URL(env.links.next.href, this.wsUrl).href;
                this.loadSearchResults(absoluteUrl);
            });
            navDiv.append(nextLink);
        }
        // Attach list + nav to #result
        this.result.append(ul, navDiv);
    }
    async showBookDetails(selfUrl) {
        this.clearErrors();
        this.result.innerHTML = '';
        const result = await this.ws.getBookByUrl(selfUrl);
        console.log(`Book details result: `, result);
        const env = this.unwrap(result);
        if (!env) {
            return;
        }
        const book = env.result;
        const dl = makeElement('dl', { class: 'book-details' });
        const addField = (label, value) => {
            dl.append(makeElement('dt', {}, label), makeElement('dd', {}, value != null ? String(value) : ''));
        };
        // These property names assume the usual XBook shape from previous projects
        addField('ISBN', book.isbn);
        addField('Title', book.title);
        addField('Authors', book.authors?.join
            ? book.authors.join(', ')
            : book.authors);
        addField('Publisher', book.publisher);
        addField('Year', book.year ?? book.pubYear);
        addField('Copies', book.copies ?? book.numCopies);
        // Borrowers line – required by spec
        dl.append(makeElement('dt', {}, 'Borrowers'), makeElement('dd', { id: 'borrowers' }, 'None'));
        const container = makeElement('div', { id: 'book-details' }, dl);
        const form = makeElement('form', { id: 'checkout-form' });
        const label = makeElement('label', {}, 'Patron ID: ');
        const patronInput = makeElement('input', {
            id: 'patronId',
            name: 'patronId',
            type: 'text',
        });
        const patronError = makeElement('span', {
            id: 'patronId-error',
            class: 'error',
        });
        label.append(patronInput);
        const submitBtn = makeElement('button', { type: 'submit' }, 'Check Out');
        form.append(label, patronError, submitBtn);
        container.append(form);
        this.result.append(container);
        const isbn = book.isbn;
        this.attachCheckoutHandler(isbn);
        await this.refreshBorrowers(isbn);
    }
    attachCheckoutHandler(isbn) {
        const form = document.querySelector('#checkout-form');
        if (!form) {
            return;
        }
        form.addEventListener('submit', async (evt) => {
            evt.preventDefault();
            this.clearErrors();
            const patronInput = document.querySelector('#patronId');
            const patronError = document.querySelector('#patronId-error');
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
            const lend = {
                isbn,
                patronId,
            };
            const result = await this.ws.checkoutBook(lend);
            if (!result.isOk) {
                this.unwrap(result);
                return;
            }
            patronInput.value = '';
            await this.refreshBorrowers(isbn);
        });
    }
    async refreshBorrowers(isbn) {
        const borrowersDd = document.querySelector('#borrowers');
        if (!borrowersDd) {
            return;
        }
        borrowersDd.textContent = 'Loading...';
        const result = await this.ws.getLends(isbn);
        const envelope = this.unwrap(result);
        if (!envelope) {
            return;
        }
        // Extract the actual lends array from the envelope
        const lends = Array.isArray(envelope) ? envelope : envelope.result;
        if (lends.length === 0) {
            borrowersDd.textContent = 'None';
            return;
        }
        const ul = makeElement('ul');
        for (const lend of lends) {
            const li = makeElement('li');
            const patronSpan = makeElement('span', { class: 'content' }, String(lend.patronId));
            const btn = makeElement('button', { type: 'button', class: 'return-book' }, 'Return Book');
            btn.addEventListener('click', async (evt) => {
                evt.preventDefault();
                this.clearErrors();
                const res = await this.ws.returnBook(lend);
                if (!res.isOk) {
                    this.unwrap(res);
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
    unwrap(result) {
        if (result.isOk === false) {
            displayErrors(result.errors);
        }
        else {
            return result.val;
        }
    }
    /** clear out all errors */
    clearErrors() {
        this.errors.innerHTML = '';
        document.querySelectorAll(`.error`).forEach(el => {
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
function displayErrors(errors) {
    for (const err of errors) {
        const id = err.options.widget ?? err.options.path;
        const widget = id && document.querySelector(`#${id}-error`);
        if (widget) {
            widget.append(err.message);
        }
        else {
            const li = makeElement('li', { class: 'error' }, err.message);
            document.querySelector(`#errors`).append(li);
        }
    }
}
//TODO: add functions as needed
//# sourceMappingURL=app.js.map