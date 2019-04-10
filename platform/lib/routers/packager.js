/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const HttpProxy = require('http-proxy');

const proxy = HttpProxy.createProxyServer();
proxy.on('proxyReq', (proxyReq, req) => {
  copyHeader(req.headers, proxyReq, 'amp-cache-transform');
  copyHeader(req.headers, proxyReq, 'accept');
});
proxy.on('proxyRes', (proxyRes, req, res) => {
  copyHeader(proxyRes, res, 'content-type');
  copyHeader(proxyRes, res, 'content-length');
  copyHeader(proxyRes, res, 'content-range');
  copyHeader(proxyRes, res, 'cache-control');
  copyHeader(proxyRes, res, 'vary');
});
const proxyOptions = {
  target: 'https://amp-dev-sxg.appspot.com',
  changeOrigin: true,
};

function copyHeader(source, target, key) {
  const value = source[key];
  if (value) {
    //target.setHeader(key, value);
  }
}

/**
 * Proxy SXG requests to the AMPPackager:
 *
 * - If the URL starts with /amppkg/, forward the request unmodified.
 * - If the URL points to an AMP page and the AMP-Cache-Transform request header is present,
 *   rewrite the URL by prepending /priv/doc and forward the request.
 *
 * See https://github.com/ampproject/amppackager#productionizing
 */
const packager = (request, response, next) => {
  try {
    if (request.path.startsWith('/amppkg/')) {
      sxgProxy(request, response, request.url);
      return;
    }
    if (!request.path.endsWith('.amp.html')) {
      next();
      return;
    }

    response.set('vary', 'Accept, AMP-Cache-Transform');
    if (!request.header('amp-cache-transform')) {
      next();
      return;
    }
    // hard code amp.dev as it has to match the cert
    const url = `/priv/doc?sign=https://amp.dev${request.url}`;
    sxgProxy(request, response, url);
  } catch (error) {
    next(error);
  }
};

async function sxgProxy(request, response, url) {
  console.log('[packager] proxy', url, request.headers);
  request.url = url;
  proxy.web(request, response, proxyOptions);
}

module.exports = packager;
