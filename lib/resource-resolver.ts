import {ResourceLoader} from '@angular/compiler';


/**
 * Provides interface for a resource loader/resolver.
 * It is responsible for getting resources from some source.
 * A typical implementation of this interface will get files from the hard drive.
 *
 * @export
 * @interface ResourceResolver
 * @extends {ResourceLoader}
 */
export interface ResourceResolver extends ResourceLoader {

  /**
   * Gets the resource asynchronously.
   *
   * @param {*} url
   * @returns {Promise<string>}
   *
   * @memberOf ResourceResolver
   */
  get(url: any): Promise<string>;

  /**
   * Returns the resource synchronously. This could be either
   * synchronous read of data from the hard drive, a sync XHR, etc.
   *
   * @param {string} url
   * @returns {string}
   *
   * @memberOf ResourceResolver
   */
  getSync(url: string): string;
}
