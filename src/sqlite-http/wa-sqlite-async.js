// This file is originally from:
// https://github.com/rhashimoto/wa-sqlite/blob/master/dist/wa-sqlite-async.mjs
//
// MIT License
//
// Copyright (c) 2023 Roy T. Hashimoto
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

var Module = (() => {
  var _scriptDir = import.meta.url;

  return (
    function (moduleArg = {}) {

      var e = moduleArg, aa, ba; e.ready = new Promise((a, b) => { aa = a; ba = b }); var da = Object.assign({}, e), ea = "./this.program", fa = (a, b) => { throw b; }, ha = "", ia, ja, fs = require("fs"), ka = require("path"); ha = require("url").fileURLToPath(new URL("./", import.meta.url)); ia = a => { a = a.startsWith("file://") ? new URL(a) : ka.normalize(a); return fs.readFileSync(a, void 0) }; ja = a => { a = ia(a); a.buffer || (a = new Uint8Array(a)); return a }; !e.thisProgram && 1 < process.argv.length && (ea = process.argv[1].replace(/\\/g, "/")); process.argv.slice(2);
      fa = (a, b) => { process.exitCode = a; throw b; }; e.inspect = () => "[Emscripten Module object]"; var la = e.print || console.log.bind(console), ma = e.printErr || console.error.bind(console); Object.assign(e, da); da = null; e.thisProgram && (ea = e.thisProgram); e.quit && (fa = e.quit); var na; e.wasmBinary && (na = e.wasmBinary); var noExitRuntime = e.noExitRuntime || !0; "object" != typeof WebAssembly && p("no native wasm support detected"); var oa, t = !1, pa, u, v, qa, x, y, ra, sa;
      function ta() { var a = oa.buffer; e.HEAP8 = u = new Int8Array(a); e.HEAP16 = qa = new Int16Array(a); e.HEAP32 = x = new Int32Array(a); e.HEAPU8 = v = new Uint8Array(a); e.HEAPU16 = new Uint16Array(a); e.HEAPU32 = y = new Uint32Array(a); e.HEAPF32 = ra = new Float32Array(a); e.HEAPF64 = sa = new Float64Array(a) } var ua = [], va = [], wa = [], xa = [], ya = 0; function za() { var a = e.preRun.shift(); ua.unshift(a) } var A = 0, Aa = null, Ba = null;
      function p(a) { if (e.onAbort) e.onAbort(a); a = "Aborted(" + a + ")"; ma(a); t = !0; pa = 1; a = new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info."); ba(a); throw a; } var B; if (e.locateFile) { if (B = "wa-sqlite-async.wasm", !B.startsWith("data:application/octet-stream;base64,")) { var Ca = B; B = e.locateFile ? e.locateFile(Ca, ha) : ha + Ca } } else B = (new URL("wa-sqlite-async.wasm", import.meta.url)).href;
      function Da() { var a = B; return Promise.resolve().then(() => { if (a == B && na) var b = new Uint8Array(na); else if (ja) b = ja(a); else throw "both async and sync fetching of the wasm failed"; return b }) } function Ea(a, b) { return Da().then(c => WebAssembly.instantiate(c, a)).then(c => c).then(b, c => { ma("failed to asynchronously prepare wasm: " + c); p(c) }) } function Fa(a, b) { return Ea(a, b) } var C, E; function Ga(a) { this.name = "ExitStatus"; this.message = `Program terminated with exit(${a})`; this.status = a } var Ha = a => { for (; 0 < a.length;)a.shift()(e) };
      function H(a, b = "i8") { b.endsWith("*") && (b = "*"); switch (b) { case "i1": return u[a >> 0]; case "i8": return u[a >> 0]; case "i16": return qa[a >> 1]; case "i32": return x[a >> 2]; case "i64": p("to do getValue(i64) use WASM_BIGINT"); case "float": return ra[a >> 2]; case "double": return sa[a >> 3]; case "*": return y[a >> 2]; default: p(`invalid type for getValue: ${b}`) } }
      function I(a, b, c = "i8") { c.endsWith("*") && (c = "*"); switch (c) { case "i1": u[a >> 0] = b; break; case "i8": u[a >> 0] = b; break; case "i16": qa[a >> 1] = b; break; case "i32": x[a >> 2] = b; break; case "i64": p("to do setValue(i64) use WASM_BIGINT"); case "float": ra[a >> 2] = b; break; case "double": sa[a >> 3] = b; break; case "*": y[a >> 2] = b; break; default: p(`invalid type for setValue: ${c}`) } }
      var Ia = "undefined" != typeof TextDecoder ? new TextDecoder("utf8") : void 0, J = (a, b, c) => { var d = b + c; for (c = b; a[c] && !(c >= d);)++c; if (16 < c - b && a.buffer && Ia) return Ia.decode(a.subarray(b, c)); for (d = ""; b < c;) { var f = a[b++]; if (f & 128) { var h = a[b++] & 63; if (192 == (f & 224)) d += String.fromCharCode((f & 31) << 6 | h); else { var g = a[b++] & 63; f = 224 == (f & 240) ? (f & 15) << 12 | h << 6 | g : (f & 7) << 18 | h << 12 | g << 6 | a[b++] & 63; 65536 > f ? d += String.fromCharCode(f) : (f -= 65536, d += String.fromCharCode(55296 | f >> 10, 56320 | f & 1023)) } } else d += String.fromCharCode(f) } return d },
        Ja = (a, b) => { for (var c = 0, d = a.length - 1; 0 <= d; d--) { var f = a[d]; "." === f ? a.splice(d, 1) : ".." === f ? (a.splice(d, 1), c++) : c && (a.splice(d, 1), c--) } if (b) for (; c; c--)a.unshift(".."); return a }, L = a => { var b = "/" === a.charAt(0), c = "/" === a.substr(-1); (a = Ja(a.split("/").filter(d => !!d), !b).join("/")) || b || (a = "."); a && c && (a += "/"); return (b ? "/" : "") + a }, Ka = a => { var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1); a = b[0]; b = b[1]; if (!a && !b) return "."; b && (b = b.substr(0, b.length - 1)); return a + b }, La = a => {
          if ("/" ===
            a) return "/"; a = L(a); a = a.replace(/\/$/, ""); var b = a.lastIndexOf("/"); return -1 === b ? a : a.substr(b + 1)
        }, Ma = () => { if ("object" == typeof crypto && "function" == typeof crypto.getRandomValues) return c => crypto.getRandomValues(c); try { var a = require("crypto"); if (a.randomFillSync) return c => a.randomFillSync(c); var b = a.randomBytes; return c => (c.set(b(c.byteLength)), c) } catch (c) { } p("initRandomDevice") }, Na = a => (Na = Ma())(a);
      function Oa() { for (var a = "", b = !1, c = arguments.length - 1; -1 <= c && !b; c--) { b = 0 <= c ? arguments[c] : "/"; if ("string" != typeof b) throw new TypeError("Arguments to path.resolve must be strings"); if (!b) return ""; a = b + "/" + a; b = "/" === b.charAt(0) } a = Ja(a.split("/").filter(d => !!d), !b).join("/"); return (b ? "/" : "") + a || "." }
      var Pa = [], M = a => { for (var b = 0, c = 0; c < a.length; ++c) { var d = a.charCodeAt(c); 127 >= d ? b++ : 2047 >= d ? b += 2 : 55296 <= d && 57343 >= d ? (b += 4, ++c) : b += 3 } return b }, N = (a, b, c, d) => {
        if (!(0 < d)) return 0; var f = c; d = c + d - 1; for (var h = 0; h < a.length; ++h) {
          var g = a.charCodeAt(h); if (55296 <= g && 57343 >= g) { var n = a.charCodeAt(++h); g = 65536 + ((g & 1023) << 10) | n & 1023 } if (127 >= g) { if (c >= d) break; b[c++] = g } else {
            if (2047 >= g) { if (c + 1 >= d) break; b[c++] = 192 | g >> 6 } else {
              if (65535 >= g) { if (c + 2 >= d) break; b[c++] = 224 | g >> 12 } else {
                if (c + 3 >= d) break; b[c++] = 240 | g >> 18; b[c++] = 128 | g >>
                  12 & 63
              } b[c++] = 128 | g >> 6 & 63
            } b[c++] = 128 | g & 63
          }
        } b[c] = 0; return c - f
      }, Qa = []; function Ra(a, b) { Qa[a] = { input: [], output: [], Zb: b }; Sa(a, Ta) }
      var Ta = {
        open: function (a) { var b = Qa[a.node.rdev]; if (!b) throw new O(43); a.tty = b; a.seekable = !1 }, close: function (a) { a.tty.Zb.fsync(a.tty) }, fsync: function (a) { a.tty.Zb.fsync(a.tty) }, read: function (a, b, c, d) { if (!a.tty || !a.tty.Zb.nc) throw new O(60); for (var f = 0, h = 0; h < d; h++) { try { var g = a.tty.Zb.nc(a.tty) } catch (n) { throw new O(29); } if (void 0 === g && 0 === f) throw new O(6); if (null === g || void 0 === g) break; f++; b[c + h] = g } f && (a.node.timestamp = Date.now()); return f }, write: function (a, b, c, d) {
          if (!a.tty || !a.tty.Zb.hc) throw new O(60);
          try { for (var f = 0; f < d; f++)a.tty.Zb.hc(a.tty, b[c + f]) } catch (h) { throw new O(29); } d && (a.node.timestamp = Date.now()); return f
        }
      }, Ua = {
        nc: function () { a: { if (!Pa.length) { var a = null; var b = Buffer.alloc(256), c = 0, d = process.stdin.fd; try { c = fs.readSync(d, b, 0, 256, -1) } catch (f) { if (f.toString().includes("EOF")) c = 0; else throw f; } 0 < c ? a = b.slice(0, c).toString("utf-8") : a = null; if (!a) { a = null; break a } b = Array(M(a) + 1); a = N(a, b, 0, b.length); b.length = a; Pa = b } a = Pa.shift() } return a }, hc: function (a, b) {
          null === b || 10 === b ? (la(J(a.output, 0)), a.output =
            []) : 0 != b && a.output.push(b)
        }, fsync: function (a) { a.output && 0 < a.output.length && (la(J(a.output, 0)), a.output = []) }, Ec: function () { return { Ac: 25856, Cc: 5, zc: 191, Bc: 35387, yc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] } }, Fc: function () { return 0 }, Gc: function () { return [24, 80] }
      }, Va = { hc: function (a, b) { null === b || 10 === b ? (ma(J(a.output, 0)), a.output = []) : 0 != b && a.output.push(b) }, fsync: function (a) { a.output && 0 < a.output.length && (ma(J(a.output, 0)), a.output = []) } };
      function Wa(a, b) { var c = a.Nb ? a.Nb.length : 0; c >= b || (b = Math.max(b, c * (1048576 > c ? 2 : 1.125) >>> 0), 0 != c && (b = Math.max(b, 256)), c = a.Nb, a.Nb = new Uint8Array(b), 0 < a.Pb && a.Nb.set(c.subarray(0, a.Pb), 0)) }
      var P = {
        Tb: null, Sb() { return P.createNode(null, "/", 16895, 0) }, createNode(a, b, c, d) {
          if (24576 === (c & 61440) || 4096 === (c & 61440)) throw new O(63); P.Tb || (P.Tb = {
            dir: { node: { Rb: P.Cb.Rb, Qb: P.Cb.Qb, lookup: P.Cb.lookup, bc: P.Cb.bc, rename: P.Cb.rename, unlink: P.Cb.unlink, rmdir: P.Cb.rmdir, readdir: P.Cb.readdir, symlink: P.Cb.symlink }, stream: { Wb: P.Mb.Wb } }, file: { node: { Rb: P.Cb.Rb, Qb: P.Cb.Qb }, stream: { Wb: P.Mb.Wb, read: P.Mb.read, write: P.Mb.write, kc: P.Mb.kc, cc: P.Mb.cc, dc: P.Mb.dc } }, link: {
              node: { Rb: P.Cb.Rb, Qb: P.Cb.Qb, readlink: P.Cb.readlink },
              stream: {}
            }, lc: { node: { Rb: P.Cb.Rb, Qb: P.Cb.Qb }, stream: Xa }
          }); c = Ya(a, b, c, d); 16384 === (c.mode & 61440) ? (c.Cb = P.Tb.dir.node, c.Mb = P.Tb.dir.stream, c.Nb = {}) : 32768 === (c.mode & 61440) ? (c.Cb = P.Tb.file.node, c.Mb = P.Tb.file.stream, c.Pb = 0, c.Nb = null) : 40960 === (c.mode & 61440) ? (c.Cb = P.Tb.link.node, c.Mb = P.Tb.link.stream) : 8192 === (c.mode & 61440) && (c.Cb = P.Tb.lc.node, c.Mb = P.Tb.lc.stream); c.timestamp = Date.now(); a && (a.Nb[b] = c, a.timestamp = c.timestamp); return c
        }, Dc(a) {
          return a.Nb ? a.Nb.subarray ? a.Nb.subarray(0, a.Pb) : new Uint8Array(a.Nb) :
            new Uint8Array(0)
        }, Cb: {
          Rb(a) { var b = {}; b.dev = 8192 === (a.mode & 61440) ? a.id : 1; b.ino = a.id; b.mode = a.mode; b.nlink = 1; b.uid = 0; b.gid = 0; b.rdev = a.rdev; 16384 === (a.mode & 61440) ? b.size = 4096 : 32768 === (a.mode & 61440) ? b.size = a.Pb : 40960 === (a.mode & 61440) ? b.size = a.link.length : b.size = 0; b.atime = new Date(a.timestamp); b.mtime = new Date(a.timestamp); b.ctime = new Date(a.timestamp); b.qc = 4096; b.blocks = Math.ceil(b.size / b.qc); return b }, Qb(a, b) {
            void 0 !== b.mode && (a.mode = b.mode); void 0 !== b.timestamp && (a.timestamp = b.timestamp); if (void 0 !==
              b.size && (b = b.size, a.Pb != b)) if (0 == b) a.Nb = null, a.Pb = 0; else { var c = a.Nb; a.Nb = new Uint8Array(b); c && a.Nb.set(c.subarray(0, Math.min(b, a.Pb))); a.Pb = b }
          }, lookup() { throw Za[44]; }, bc(a, b, c, d) { return P.createNode(a, b, c, d) }, rename(a, b, c) { if (16384 === (a.mode & 61440)) { try { var d = Q(b, c) } catch (h) { } if (d) for (var f in d.Nb) throw new O(55); } delete a.parent.Nb[a.name]; a.parent.timestamp = Date.now(); a.name = c; b.Nb[c] = a; b.timestamp = a.parent.timestamp; a.parent = b }, unlink(a, b) { delete a.Nb[b]; a.timestamp = Date.now() }, rmdir(a, b) {
            var c =
              Q(a, b), d; for (d in c.Nb) throw new O(55); delete a.Nb[b]; a.timestamp = Date.now()
          }, readdir(a) { var b = [".", ".."], c; for (c in a.Nb) a.Nb.hasOwnProperty(c) && b.push(c); return b }, symlink(a, b, c) { a = P.createNode(a, b, 41471, 0); a.link = c; return a }, readlink(a) { if (40960 !== (a.mode & 61440)) throw new O(28); return a.link }
        }, Mb: {
          read(a, b, c, d, f) { var h = a.node.Nb; if (f >= a.node.Pb) return 0; a = Math.min(a.node.Pb - f, d); if (8 < a && h.subarray) b.set(h.subarray(f, f + a), c); else for (d = 0; d < a; d++)b[c + d] = h[f + d]; return a }, write(a, b, c, d, f, h) {
            b.buffer ===
            u.buffer && (h = !1); if (!d) return 0; a = a.node; a.timestamp = Date.now(); if (b.subarray && (!a.Nb || a.Nb.subarray)) { if (h) return a.Nb = b.subarray(c, c + d), a.Pb = d; if (0 === a.Pb && 0 === f) return a.Nb = b.slice(c, c + d), a.Pb = d; if (f + d <= a.Pb) return a.Nb.set(b.subarray(c, c + d), f), d } Wa(a, f + d); if (a.Nb.subarray && b.subarray) a.Nb.set(b.subarray(c, c + d), f); else for (h = 0; h < d; h++)a.Nb[f + h] = b[c + h]; a.Pb = Math.max(a.Pb, f + d); return d
          }, Wb(a, b, c) { 1 === c ? b += a.position : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.Pb); if (0 > b) throw new O(28); return b },
          kc(a, b, c) { Wa(a.node, b + c); a.node.Pb = Math.max(a.node.Pb, b + c) }, cc(a, b, c, d, f) { if (32768 !== (a.node.mode & 61440)) throw new O(43); a = a.node.Nb; if (f & 2 || a.buffer !== u.buffer) { if (0 < c || c + b < a.length) a.subarray ? a = a.subarray(c, c + b) : a = Array.prototype.slice.call(a, c, c + b); c = !0; b = 65536 * Math.ceil(b / 65536); (f = $a(65536, b)) ? (v.fill(0, f, f + b), b = f) : b = 0; if (!b) throw new O(48); u.set(a, b) } else c = !1, b = a.byteOffset; return { uc: b, pc: c } }, dc(a, b, c, d) { P.Mb.write(a, b, 0, d, c, !1); return 0 }
        }
      };
      function ab(a, b) { var c = 0; a && (c |= 365); b && (c |= 146); return c }
      var bb = null, cb = {}, db = [], eb = 1, R = null, fb = !0, O = null, Za = {}, S = (a, b = {}) => { a = Oa(a); if (!a) return { path: "", node: null }; b = Object.assign({ mc: !0, ic: 0 }, b); if (8 < b.ic) throw new O(32); a = a.split("/").filter(g => !!g); for (var c = bb, d = "/", f = 0; f < a.length; f++) { var h = f === a.length - 1; if (h && b.parent) break; c = Q(c, a[f]); d = L(d + "/" + a[f]); c.Xb && (!h || h && b.mc) && (c = c.Xb.root); if (!h || b.Vb) for (h = 0; 40960 === (c.mode & 61440);)if (c = gb(d), d = Oa(Ka(d), c), c = S(d, { ic: b.ic + 1 }).node, 40 < h++) throw new O(32); } return { path: d, node: c } }, hb = a => {
        for (var b; ;) {
          if (a ===
            a.parent) return a = a.Sb.oc, b ? "/" !== a[a.length - 1] ? `${a}/${b}` : a + b : a; b = b ? `${a.name}/${b}` : a.name; a = a.parent
        }
      }, ib = (a, b) => { for (var c = 0, d = 0; d < b.length; d++)c = (c << 5) - c + b.charCodeAt(d) | 0; return (a + c >>> 0) % R.length }, jb = a => { var b = ib(a.parent.id, a.name); if (R[b] === a) R[b] = a.Yb; else for (b = R[b]; b;) { if (b.Yb === a) { b.Yb = a.Yb; break } b = b.Yb } }, Q = (a, b) => { var c; if (c = (c = kb(a, "x")) ? c : a.Cb.lookup ? 0 : 2) throw new O(c, a); for (c = R[ib(a.id, b)]; c; c = c.Yb) { var d = c.name; if (c.parent.id === a.id && d === b) return c } return a.Cb.lookup(a, b) }, Ya = (a,
        b, c, d) => { a = new lb(a, b, c, d); b = ib(a.parent.id, a.name); a.Yb = R[b]; return R[b] = a }, mb = a => { var b = ["r", "w", "rw"][a & 3]; a & 512 && (b += "w"); return b }, kb = (a, b) => { if (fb) return 0; if (!b.includes("r") || a.mode & 292) { if (b.includes("w") && !(a.mode & 146) || b.includes("x") && !(a.mode & 73)) return 2 } else return 2; return 0 }, nb = (a, b) => { try { return Q(a, b), 20 } catch (c) { } return kb(a, "wx") }, ob = (a, b, c) => {
          try { var d = Q(a, b) } catch (f) { return f.Ob } if (a = kb(a, "wx")) return a; if (c) { if (16384 !== (d.mode & 61440)) return 54; if (d === d.parent || "/" === hb(d)) return 10 } else if (16384 ===
            (d.mode & 61440)) return 31; return 0
        }, pb = () => { for (var a = 0; 4096 >= a; a++)if (!db[a]) return a; throw new O(33); }, U = a => { a = db[a]; if (!a) throw new O(8); return a }, rb = (a, b = -1) => { qb || (qb = function () { this.ac = {} }, qb.prototype = {}, Object.defineProperties(qb.prototype, { object: { get() { return this.node }, set(c) { this.node = c } }, flags: { get() { return this.ac.flags }, set(c) { this.ac.flags = c } }, position: { get() { return this.ac.position }, set(c) { this.ac.position = c } } })); a = Object.assign(new qb, a); -1 == b && (b = pb()); a.fd = b; return db[b] = a }, Xa =
          { open: a => { a.Mb = cb[a.node.rdev].Mb; a.Mb.open && a.Mb.open(a) }, Wb: () => { throw new O(70); } }, Sa = (a, b) => { cb[a] = { Mb: b } }, sb = (a, b) => { var c = "/" === b, d = !b; if (c && bb) throw new O(10); if (!c && !d) { var f = S(b, { mc: !1 }); b = f.path; f = f.node; if (f.Xb) throw new O(10); if (16384 !== (f.mode & 61440)) throw new O(54); } b = { type: a, Ic: {}, oc: b, tc: [] }; a = a.Sb(b); a.Sb = b; b.root = a; c ? bb = a : f && (f.Xb = b, f.Sb && f.Sb.tc.push(b)) }, tb = (a, b, c) => {
            var d = S(a, { parent: !0 }).node; a = La(a); if (!a || "." === a || ".." === a) throw new O(28); var f = nb(d, a); if (f) throw new O(f);
            if (!d.Cb.bc) throw new O(63); return d.Cb.bc(d, a, b, c)
          }, V = (a, b) => tb(a, (void 0 !== b ? b : 511) & 1023 | 16384, 0), ub = (a, b, c) => { "undefined" == typeof c && (c = b, b = 438); tb(a, b | 8192, c) }, vb = (a, b) => { if (!Oa(a)) throw new O(44); var c = S(b, { parent: !0 }).node; if (!c) throw new O(44); b = La(b); var d = nb(c, b); if (d) throw new O(d); if (!c.Cb.symlink) throw new O(63); c.Cb.symlink(c, b, a) }, wb = a => {
            var b = S(a, { parent: !0 }).node; a = La(a); var c = Q(b, a), d = ob(b, a, !0); if (d) throw new O(d); if (!b.Cb.rmdir) throw new O(63); if (c.Xb) throw new O(10); b.Cb.rmdir(b,
              a); jb(c)
          }, gb = a => { a = S(a).node; if (!a) throw new O(44); if (!a.Cb.readlink) throw new O(28); return Oa(hb(a.parent), a.Cb.readlink(a)) }, xb = (a, b) => { a = S(a, { Vb: !b }).node; if (!a) throw new O(44); if (!a.Cb.Rb) throw new O(63); return a.Cb.Rb(a) }, yb = a => xb(a, !0), zb = (a, b) => { a = "string" == typeof a ? S(a, { Vb: !0 }).node : a; if (!a.Cb.Qb) throw new O(63); a.Cb.Qb(a, { mode: b & 4095 | a.mode & -4096, timestamp: Date.now() }) }, Ab = (a, b) => {
            if (0 > b) throw new O(28); a = "string" == typeof a ? S(a, { Vb: !0 }).node : a; if (!a.Cb.Qb) throw new O(63); if (16384 === (a.mode &
              61440)) throw new O(31); if (32768 !== (a.mode & 61440)) throw new O(28); var c = kb(a, "w"); if (c) throw new O(c); a.Cb.Qb(a, { size: b, timestamp: Date.now() })
          }, Cb = (a, b, c) => {
            if ("" === a) throw new O(44); if ("string" == typeof b) { var d = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[b]; if ("undefined" == typeof d) throw Error(`Unknown file open mode: ${b}`); b = d } c = b & 64 ? ("undefined" == typeof c ? 438 : c) & 4095 | 32768 : 0; if ("object" == typeof a) var f = a; else { a = L(a); try { f = S(a, { Vb: !(b & 131072) }).node } catch (h) { } } d = !1; if (b & 64) if (f) {
              if (b & 128) throw new O(20);
            } else f = tb(a, c, 0), d = !0; if (!f) throw new O(44); 8192 === (f.mode & 61440) && (b &= -513); if (b & 65536 && 16384 !== (f.mode & 61440)) throw new O(54); if (!d && (c = f ? 40960 === (f.mode & 61440) ? 32 : 16384 === (f.mode & 61440) && ("r" !== mb(b) || b & 512) ? 31 : kb(f, mb(b)) : 44)) throw new O(c); b & 512 && !d && Ab(f, 0); b &= -131713; f = rb({ node: f, path: hb(f), flags: b, seekable: !0, position: 0, Mb: f.Mb, xc: [], error: !1 }); f.Mb.open && f.Mb.open(f); !e.logReadFiles || b & 1 || (Bb || (Bb = {}), a in Bb || (Bb[a] = 1)); return f
          }, Db = (a, b, c) => {
            if (null === a.fd) throw new O(8); if (!a.seekable ||
              !a.Mb.Wb) throw new O(70); if (0 != c && 1 != c && 2 != c) throw new O(28); a.position = a.Mb.Wb(a, b, c); a.xc = []
          }, Eb = () => { O || (O = function (a, b) { this.name = "ErrnoError"; this.node = b; this.vc = function (c) { this.Ob = c }; this.vc(a); this.message = "FS error" }, O.prototype = Error(), O.prototype.constructor = O, [44].forEach(a => { Za[a] = new O(a); Za[a].stack = "<generic error, no stack>" })) }, Fb, Hb = (a, b, c) => {
            a = L("/dev/" + a); var d = ab(!!b, !!c); Gb || (Gb = 64); var f = Gb++ << 8 | 0; Sa(f, {
              open: h => { h.seekable = !1 }, close: () => { c && c.buffer && c.buffer.length && c(10) },
              read: (h, g, n, k) => { for (var l = 0, r = 0; r < k; r++) { try { var m = b() } catch (q) { throw new O(29); } if (void 0 === m && 0 === l) throw new O(6); if (null === m || void 0 === m) break; l++; g[n + r] = m } l && (h.node.timestamp = Date.now()); return l }, write: (h, g, n, k) => { for (var l = 0; l < k; l++)try { c(g[n + l]) } catch (r) { throw new O(29); } k && (h.node.timestamp = Date.now()); return l }
            }); ub(a, d, f)
          }, Gb, W = {}, qb, Bb; function Ib(a, b, c) { if ("/" === b.charAt(0)) return b; a = -100 === a ? "/" : U(a).path; if (0 == b.length) { if (!c) throw new O(44); return a } return L(a + "/" + b) }
      function Jb(a, b, c) {
        try { var d = a(b) } catch (h) { if (h && h.node && L(b) !== L(hb(h.node))) return -54; throw h; } x[c >> 2] = d.dev; x[c + 4 >> 2] = d.mode; y[c + 8 >> 2] = d.nlink; x[c + 12 >> 2] = d.uid; x[c + 16 >> 2] = d.gid; x[c + 20 >> 2] = d.rdev; E = [d.size >>> 0, (C = d.size, 1 <= +Math.abs(C) ? 0 < C ? +Math.floor(C / 4294967296) >>> 0 : ~~+Math.ceil((C - +(~~C >>> 0)) / 4294967296) >>> 0 : 0)]; x[c + 24 >> 2] = E[0]; x[c + 28 >> 2] = E[1]; x[c + 32 >> 2] = 4096; x[c + 36 >> 2] = d.blocks; a = d.atime.getTime(); b = d.mtime.getTime(); var f = d.ctime.getTime(); E = [Math.floor(a / 1E3) >>> 0, (C = Math.floor(a / 1E3), 1 <=
          +Math.abs(C) ? 0 < C ? +Math.floor(C / 4294967296) >>> 0 : ~~+Math.ceil((C - +(~~C >>> 0)) / 4294967296) >>> 0 : 0)]; x[c + 40 >> 2] = E[0]; x[c + 44 >> 2] = E[1]; y[c + 48 >> 2] = a % 1E3 * 1E3; E = [Math.floor(b / 1E3) >>> 0, (C = Math.floor(b / 1E3), 1 <= +Math.abs(C) ? 0 < C ? +Math.floor(C / 4294967296) >>> 0 : ~~+Math.ceil((C - +(~~C >>> 0)) / 4294967296) >>> 0 : 0)]; x[c + 56 >> 2] = E[0]; x[c + 60 >> 2] = E[1]; y[c + 64 >> 2] = b % 1E3 * 1E3; E = [Math.floor(f / 1E3) >>> 0, (C = Math.floor(f / 1E3), 1 <= +Math.abs(C) ? 0 < C ? +Math.floor(C / 4294967296) >>> 0 : ~~+Math.ceil((C - +(~~C >>> 0)) / 4294967296) >>> 0 : 0)]; x[c + 72 >> 2] = E[0];
        x[c + 76 >> 2] = E[1]; y[c + 80 >> 2] = f % 1E3 * 1E3; E = [d.ino >>> 0, (C = d.ino, 1 <= +Math.abs(C) ? 0 < C ? +Math.floor(C / 4294967296) >>> 0 : ~~+Math.ceil((C - +(~~C >>> 0)) / 4294967296) >>> 0 : 0)]; x[c + 88 >> 2] = E[0]; x[c + 92 >> 2] = E[1]; return 0
      } var Kb = void 0; function Lb() { Kb += 4; return x[Kb - 4 >> 2] } function Mb(a, b) { return b + 2097152 >>> 0 < 4194305 - !!a ? (a >>> 0) + 4294967296 * b : NaN }
      var Nb = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Ob = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Qb = a => { var b = M(a) + 1, c = Pb(b); c && N(a, v, c, b); return c }, Rb = {}, Tb = () => { if (!Sb) { var a = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: ("object" == typeof navigator && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8", _: ea || "./this.program" }, b; for (b in Rb) void 0 === Rb[b] ? delete a[b] : a[b] = Rb[b]; var c = []; for (b in a) c.push(`${b}=${a[b]}`); Sb = c } return Sb }, Sb;
      function Ub() { } function Vb() { } function Wb() { } function Xb() { } function Yb() { } function Zb() { } function $b() { } function ac() { } function bc() { } function cc() { } function dc() { } function ec() { } function fc() { } function gc() { } function hc() { } function ic() { } function jc() { } function kc() { } function lc() { } function mc() { } function nc() { } function oc() { } function pc() { } function qc() { } function rc() { } function sc() { } function tc() { } function uc() { } function vc() { } function wc() { } function xc() { } function yc() { } function zc() { }
      function Ac() { } function Bc() { } function Cc() { } function Dc() { } function Ec() { } function Fc() { } var Gc = a => { pa = a; if (!(noExitRuntime || 0 < ya)) { if (e.onExit) e.onExit(a); t = !0 } fa(a, new Ga(a)) }, Hc = a => { a instanceof Ga || "unwind" == a || fa(1, a) }; function Ic(a) { try { a() } catch (b) { p(b) } }
      function Jc(a) { var b = {}, c; for (c in a) (function (d) { var f = a[d]; b[d] = "function" == typeof f ? function () { Kc.push(d); try { return f.apply(null, arguments) } finally { t || (Kc.pop() === d || p(), X && 1 === Y && 0 === Kc.length && (Y = 0, Ic(Lc), "undefined" != typeof Fibers && Fibers.Jc())) } } : f })(c); return b } var Y = 0, X = null, Mc = 0, Kc = [], Nc = {}, Oc = {}, Pc = 0, Qc = null, Rc = []; function Sc() { return new Promise((a, b) => { Qc = { resolve: a, reject: b } }) }
      function Tc() { var a = Pb(16396), b = a + 12; x[a >> 2] = b; x[a + 4 >> 2] = b + 16384; b = Kc[0]; var c = Nc[b]; void 0 === c && (c = Pc++, Nc[b] = c, Oc[c] = b); x[a + 8 >> 2] = c; return a }
      function Uc(a) {
        if (!t) {
          if (0 === Y) { var b = !1, c = !1; a((d = 0) => { if (!t && (Mc = d, b = !0, c)) { Y = 2; Ic(() => Vc(X)); "undefined" != typeof Browser && Browser.fc.sc && Browser.fc.resume(); d = !1; try { var f = (0, e.asm[Oc[x[X + 8 >> 2]]])() } catch (n) { f = n, d = !0 } var h = !1; if (!X) { var g = Qc; g && (Qc = null, (d ? g.reject : g.resolve)(f), h = !0) } if (d && !h) throw f; } }); c = !0; b || (Y = 1, X = Tc(), "undefined" != typeof Browser && Browser.fc.sc && Browser.fc.pause(), Ic(() => Wc(X))) } else 2 === Y ? (Y = 0, Ic(Xc), Yc(X), X = null, Rc.forEach(d => {
            if (!t) try {
              if (d(), !(noExitRuntime || 0 < ya)) try {
                pa =
                d = pa, Gc(d)
              } catch (f) { Hc(f) }
            } catch (f) { Hc(f) }
          })) : p(`invalid state: ${Y}`); return Mc
        }
      } function Zc(a) { return Uc(b => { a().then(b) }) } var $c = {};
      function Z(a, b, c, d, f) { function h(m) { --ya; 0 !== k && ad(k); return "string" === b ? m ? J(v, m) : "" : "boolean" === b ? !!m : m } var g = { string: m => { var q = 0; if (null !== m && void 0 !== m && 0 !== m) { q = M(m) + 1; var w = bd(q); N(m, v, w, q); q = w } return q }, array: m => { var q = bd(m.length); u.set(m, q); return q } }; a = e["_" + a]; var n = [], k = 0; if (d) for (var l = 0; l < d.length; l++) { var r = g[c[l]]; r ? (0 === k && (k = cd()), n[l] = r(d[l])) : n[l] = d[l] } c = X; d = a.apply(null, n); f = f && f.async; ya += 1; if (X != c) return Sc().then(h); d = h(d); return f ? Promise.resolve(d) : d }
      function lb(a, b, c, d) { a || (a = this); this.parent = a; this.Sb = a.Sb; this.Xb = null; this.id = eb++; this.name = b; this.mode = c; this.Cb = {}; this.Mb = {}; this.rdev = d } Object.defineProperties(lb.prototype, { read: { get: function () { return 365 === (this.mode & 365) }, set: function (a) { a ? this.mode |= 365 : this.mode &= -366 } }, write: { get: function () { return 146 === (this.mode & 146) }, set: function (a) { a ? this.mode |= 146 : this.mode &= -147 } } }); Eb(); R = Array(4096); sb(P, "/"); V("/tmp"); V("/home"); V("/home/web_user");
      (() => { V("/dev"); Sa(259, { read: () => 0, write: (d, f, h, g) => g }); ub("/dev/null", 259); Ra(1280, Ua); Ra(1536, Va); ub("/dev/tty", 1280); ub("/dev/tty1", 1536); var a = new Uint8Array(1024), b = 0, c = () => { 0 === b && (b = Na(a).byteLength); return a[--b] }; Hb("random", c); Hb("urandom", c); V("/dev/shm"); V("/dev/shm/tmp") })();
      (() => { V("/proc"); var a = V("/proc/self"); V("/proc/self/fd"); sb({ Sb: () => { var b = Ya(a, "fd", 16895, 73); b.Cb = { lookup: (c, d) => { var f = U(+d); c = { parent: null, Sb: { oc: "fake" }, Cb: { readlink: () => f.path } }; return c.parent = c } }; return b } }, "/proc/self/fd") })();
      (function () { const a = new Map; e.setAuthorizer = function (b, c, d) { c ? a.set(b, { f: c, jc: d }) : a.delete(b); return Z("set_authorizer", "number", ["number"], [b]) }; Ub = function (b, c, d, f, h, g) { if (a.has(b)) { const { f: n, jc: k } = a.get(b); return n(k, c, d ? d ? J(v, d) : "" : null, f ? f ? J(v, f) : "" : null, h ? h ? J(v, h) : "" : null, g ? g ? J(v, g) : "" : null) } return 0 } })();
      (function () {
        const a = new Map, b = new Map; e.createFunction = function (c, d, f, h, g, n) { const k = a.size; a.set(k, { f: n, Ub: g }); return Z("create_function", "number", "number string number number number number".split(" "), [c, d, f, h, k, 0]) }; e.createAggregate = function (c, d, f, h, g, n, k) { const l = a.size; a.set(l, { step: n, rc: k, Ub: g }); return Z("create_function", "number", "number string number number number number".split(" "), [c, d, f, h, l, 1]) }; e.getFunctionUserData = function (c) { return b.get(c) }; Wb = function (c, d, f, h) {
          c = a.get(c); b.set(d,
            c.Ub); c.f(d, new Uint32Array(v.buffer, h, f)); b.delete(d)
        }; Yb = function (c, d, f, h) { c = a.get(c); b.set(d, c.Ub); c.step(d, new Uint32Array(v.buffer, h, f)); b.delete(d) }; Vb = function (c, d) { c = a.get(c); b.set(d, c.Ub); c.rc(d); b.delete(d) }
      })(); (function () { const a = new Map; e.progressHandler = function (b, c, d, f) { d ? a.set(b, { f: d, jc: f }) : a.delete(b); return Z("progress_handler", null, ["number", "number"], [b, c]) }; Xb = function (b) { if (a.has(b)) { const { f: c, jc: d } = a.get(b); return c(d) } return 0 } })();
      (function () {
        function a(k, l) { const r = `get${k}`, m = `set${k}`; return new Proxy(new DataView(v.buffer, l, "Int32" === k ? 4 : 8), { get(q, w) { if (w === r) return function (z, F) { if (!F) throw Error("must be little endian"); return q[w](z, F) }; if (w === m) return function (z, F, D) { if (!D) throw Error("must be little endian"); return q[w](z, F, D) }; if ("string" === typeof w && w.match(/^(get)|(set)/)) throw Error("invalid type"); return q[w] } }) } const b = "object" === typeof $c, c = new Map, d = new Map, f = new Map, h = b ? new Set : null, g = b ? new Set : null, n = new Map;
        oc = function (k, l, r, m) { n.set(k ? J(v, k) : "", { size: l, $b: Array.from(new Uint32Array(v.buffer, m, r)) }) }; e.createModule = function (k, l, r, m) {
          b && (r.handleAsync = Zc); const q = c.size; c.set(q, { module: r, Ub: m }); m = 0; r.xCreate && (m |= 1); r.xConnect && (m |= 2); r.xBestIndex && (m |= 4); r.xDisconnect && (m |= 8); r.xDestroy && (m |= 16); r.xOpen && (m |= 32); r.xClose && (m |= 64); r.xFilter && (m |= 128); r.xNext && (m |= 256); r.xEof && (m |= 512); r.xColumn && (m |= 1024); r.xRowid && (m |= 2048); r.xUpdate && (m |= 4096); r.xBegin && (m |= 8192); r.xSync && (m |= 16384); r.xCommit && (m |=
            32768); r.xRollback && (m |= 65536); r.xFindFunction && (m |= 131072); r.xRename && (m |= 262144); return Z("create_module", "number", ["number", "string", "number", "number"], [k, l, q, m])
        }; ec = function (k, l, r, m, q, w) { l = c.get(l); d.set(q, l); if (b) { h.delete(q); for (const z of h) d.delete(z) } m = Array.from(new Uint32Array(v.buffer, m, r)).map(z => z ? J(v, z) : ""); return l.module.xCreate(k, l.Ub, m, q, a("Int32", w)) }; dc = function (k, l, r, m, q, w) {
          l = c.get(l); d.set(q, l); if (b) { h.delete(q); for (const z of h) d.delete(z) } m = Array.from(new Uint32Array(v.buffer,
            m, r)).map(z => z ? J(v, z) : ""); return l.module.xConnect(k, l.Ub, m, q, a("Int32", w))
        }; $b = function (k, l) {
          var r = d.get(k), m = n.get("sqlite3_index_info").$b; const q = {}; q.nConstraint = H(l + m[0], "i32"); q.aConstraint = []; var w = H(l + m[1], "*"), z = n.get("sqlite3_index_constraint").size; for (var F = 0; F < q.nConstraint; ++F) { var D = q.aConstraint, K = D.push, G = w + F * z, ca = n.get("sqlite3_index_constraint").$b, T = {}; T.iColumn = H(G + ca[0], "i32"); T.op = H(G + ca[1], "i8"); T.usable = !!H(G + ca[2], "i8"); K.call(D, T) } q.nOrderBy = H(l + m[2], "i32"); q.aOrderBy =
            []; w = H(l + m[3], "*"); z = n.get("sqlite3_index_orderby").size; for (F = 0; F < q.nOrderBy; ++F)D = q.aOrderBy, K = D.push, G = w + F * z, ca = n.get("sqlite3_index_orderby").$b, T = {}, T.iColumn = H(G + ca[0], "i32"), T.desc = !!H(G + ca[1], "i8"), K.call(D, T); q.aConstraintUsage = []; for (w = 0; w < q.nConstraint; ++w)q.aConstraintUsage.push({ argvIndex: 0, omit: !1 }); q.idxNum = H(l + m[5], "i32"); q.idxStr = null; q.orderByConsumed = !!H(l + m[8], "i8"); q.estimatedCost = H(l + m[9], "double"); q.estimatedRows = H(l + m[10], "i64"); q.idxFlags = H(l + m[11], "i32"); q.colUsed = H(l + m[12],
              "i64"); k = r.module.xBestIndex(k, q); r = n.get("sqlite3_index_info").$b; m = H(l + r[4], "*"); w = n.get("sqlite3_index_constraint_usage").size; for (K = 0; K < q.nConstraint; ++K)z = m + K * w, D = q.aConstraintUsage[K], G = n.get("sqlite3_index_constraint_usage").$b, I(z + G[0], D.argvIndex, "i32"), I(z + G[1], D.omit ? 1 : 0, "i8"); I(l + r[5], q.idxNum, "i32"); "string" === typeof q.idxStr && (m = M(q.idxStr), w = Z("sqlite3_malloc", "number", ["number"], [m + 1]), N(q.idxStr, v, w, m + 1), I(l + r[6], w, "*"), I(l + r[7], 1, "i32")); I(l + r[8], q.orderByConsumed, "i32"); I(l + r[9],
                q.estimatedCost, "double"); I(l + r[10], q.estimatedRows, "i64"); I(l + r[11], q.idxFlags, "i32"); return k
        }; gc = function (k) { const l = d.get(k); b ? h.add(k) : d.delete(k); return l.module.xDisconnect(k) }; fc = function (k) { const l = d.get(k); b ? h.add(k) : d.delete(k); return l.module.xDestroy(k) }; kc = function (k, l) { const r = d.get(k); f.set(l, r); if (b) { g.delete(l); for (const m of g) f.delete(m) } return r.module.xOpen(k, l) }; ac = function (k) { const l = f.get(k); b ? g.add(k) : f.delete(k); return l.module.xClose(k) }; hc = function (k) {
          return f.get(k).module.xEof(k) ?
            1 : 0
        }; ic = function (k, l, r, m, q) { const w = f.get(k); r = r ? r ? J(v, r) : "" : null; q = new Uint32Array(v.buffer, q, m); return w.module.xFilter(k, l, r, q) }; jc = function (k) { return f.get(k).module.xNext(k) }; bc = function (k, l, r) { return f.get(k).module.xColumn(k, l, r) }; nc = function (k, l) { return f.get(k).module.xRowid(k, a("BigInt64", l)) }; qc = function (k, l, r, m) { const q = d.get(k); r = new Uint32Array(v.buffer, r, l); return q.module.xUpdate(k, r, a("BigInt64", m)) }; Zb = function (k) { return d.get(k).module.xBegin(k) }; pc = function (k) { return d.get(k).module.xSync(k) };
        cc = function (k) { return d.get(k).module.xCommit(k) }; mc = function (k) { return d.get(k).module.xRollback(k) }; lc = function (k, l) { const r = d.get(k); l = l ? J(v, l) : ""; return r.module.xRename(k, l) }
      })();
      (function () {
        function a(g, n) { const k = `get${g}`, l = `set${g}`; return new Proxy(new DataView(v.buffer, n, "Int32" === g ? 4 : 8), { get(r, m) { if (m === k) return function (q, w) { if (!w) throw Error("must be little endian"); return r[m](q, w) }; if (m === l) return function (q, w, z) { if (!z) throw Error("must be little endian"); return r[m](q, w, z) }; if ("string" === typeof m && m.match(/^(get)|(set)/)) throw Error("invalid type"); return r[m] } }) } function b(g) { g >>= 2; return y[g] + y[g + 1] * 2 ** 32 } const c = "object" === typeof $c, d = new Map, f = new Map; e.registerVFS =
          function (g, n) { if (Z("sqlite3_vfs_find", "number", ["string"], [g.name])) throw Error(`VFS '${g.name}' already registered`); c && (g.handleAsync = Zc); var k = g.Hc ?? 64; const l = e._malloc(4); n = Z("register_vfs", "number", ["string", "number", "number", "number"], [g.name, k, n ? 1 : 0, l]); n || (k = H(l, "*"), d.set(k, g)); e._free(l); return n }; const h = c ? new Set : null; tc = function (g) { const n = f.get(g); c ? h.add(g) : f.delete(g); return n.xClose(g) }; Ac = function (g, n, k, l) { return f.get(g).xRead(g, v.subarray(n, n + k), b(l)) }; Fc = function (g, n, k, l) {
            return f.get(g).xWrite(g,
              v.subarray(n, n + k), b(l))
          }; Dc = function (g, n) { return f.get(g).xTruncate(g, b(n)) }; Cc = function (g, n) { return f.get(g).xSync(g, n) }; xc = function (g, n) { const k = f.get(g); n = a("BigInt64", n); return k.xFileSize(g, n) }; yc = function (g, n) { return f.get(g).xLock(g, n) }; Ec = function (g, n) { return f.get(g).xUnlock(g, n) }; sc = function (g, n) { const k = f.get(g); n = a("Int32", n); return k.xCheckReservedLock(g, n) }; wc = function (g, n, k) { const l = f.get(g); k = new DataView(v.buffer, k); return l.xFileControl(g, n, k) }; Bc = function (g) { return f.get(g).xSectorSize(g) };
        vc = function (g) { return f.get(g).xDeviceCharacteristics(g) }; zc = function (g, n, k, l, r) { g = d.get(g); f.set(k, g); if (c) { h.delete(k); for (var m of h) f.delete(m) } m = null; if (l & 64) { m = 1; const q = []; for (; m;) { const w = v[n++]; if (w) q.push(w); else switch (v[n] || (m = null), m) { case 1: q.push(63); m = 2; break; case 2: q.push(61); m = 3; break; case 3: q.push(38), m = 2 } } m = (new TextDecoder).decode(new Uint8Array(q)) } else n && (m = n ? J(v, n) : ""); r = a("Int32", r); return g.xOpen(m, k, l, r) }; uc = function (g, n, k) { return d.get(g).xDelete(n ? J(v, n) : "", k) }; rc = function (g,
          n, k, l) { g = d.get(g); l = a("Int32", l); return g.xAccess(n ? J(v, n) : "", k, l) }
      })();
      var ed = {
        a: (a, b, c, d) => { p(`Assertion failed: ${a ? J(v, a) : ""}, at: ` + [b ? b ? J(v, b) : "" : "unknown filename", c, d ? d ? J(v, d) : "" : "unknown function"]) }, K: function (a, b) { try { return a = a ? J(v, a) : "", zb(a, b), 0 } catch (c) { if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c; return -c.Ob } }, M: function (a, b, c) {
          try { b = b ? J(v, b) : ""; b = Ib(a, b); if (c & -8) return -28; var d = S(b, { Vb: !0 }).node; if (!d) return -44; a = ""; c & 4 && (a += "r"); c & 2 && (a += "w"); c & 1 && (a += "x"); return a && kb(d, a) ? -2 : 0 } catch (f) {
            if ("undefined" == typeof W || "ErrnoError" !== f.name) throw f;
            return -f.Ob
          }
        }, L: function (a, b) { try { var c = U(a); zb(c.node, b); return 0 } catch (d) { if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d; return -d.Ob } }, J: function (a) { try { var b = U(a).node; var c = "string" == typeof b ? S(b, { Vb: !0 }).node : b; if (!c.Cb.Qb) throw new O(63); c.Cb.Qb(c, { timestamp: Date.now() }); return 0 } catch (d) { if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d; return -d.Ob } }, b: function (a, b, c) {
          Kb = c; try {
            var d = U(a); switch (b) {
              case 0: var f = Lb(); return 0 > f ? -28 : rb(d, f).fd; case 1: case 2: return 0; case 3: return d.flags;
              case 4: return f = Lb(), d.flags |= f, 0; case 5: return f = Lb(), qa[f + 0 >> 1] = 2, 0; case 6: case 7: return 0; case 16: case 8: return -28; case 9: return x[dd() >> 2] = 28, -1; default: return -28
            }
          } catch (h) { if ("undefined" == typeof W || "ErrnoError" !== h.name) throw h; return -h.Ob }
        }, I: function (a, b) { try { var c = U(a); return Jb(xb, c.path, b) } catch (d) { if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d; return -d.Ob } }, n: function (a, b, c) {
          b = Mb(b, c); try { if (isNaN(b)) return 61; var d = U(a); if (0 === (d.flags & 2097155)) throw new O(28); Ab(d.node, b); return 0 } catch (f) {
            if ("undefined" ==
              typeof W || "ErrnoError" !== f.name) throw f; return -f.Ob
          }
        }, C: function (a, b) { try { if (0 === b) return -28; var c = M("/") + 1; if (b < c) return -68; N("/", v, a, b); return c } catch (d) { if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d; return -d.Ob } }, F: function (a, b) { try { return a = a ? J(v, a) : "", Jb(yb, a, b) } catch (c) { if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c; return -c.Ob } }, z: function (a, b, c) {
          try { return b = b ? J(v, b) : "", b = Ib(a, b), b = L(b), "/" === b[b.length - 1] && (b = b.substr(0, b.length - 1)), V(b, c), 0 } catch (d) {
            if ("undefined" == typeof W ||
              "ErrnoError" !== d.name) throw d; return -d.Ob
          }
        }, E: function (a, b, c, d) { try { b = b ? J(v, b) : ""; var f = d & 256; b = Ib(a, b, d & 4096); return Jb(f ? yb : xb, b, c) } catch (h) { if ("undefined" == typeof W || "ErrnoError" !== h.name) throw h; return -h.Ob } }, y: function (a, b, c, d) { Kb = d; try { b = b ? J(v, b) : ""; b = Ib(a, b); var f = d ? Lb() : 0; return Cb(b, c, f).fd } catch (h) { if ("undefined" == typeof W || "ErrnoError" !== h.name) throw h; return -h.Ob } }, w: function (a, b, c, d) {
          try {
            b = b ? J(v, b) : ""; b = Ib(a, b); if (0 >= d) return -28; var f = gb(b), h = Math.min(d, M(f)), g = u[c + h]; N(f, v, c, d + 1); u[c +
              h] = g; return h
          } catch (n) { if ("undefined" == typeof W || "ErrnoError" !== n.name) throw n; return -n.Ob }
        }, u: function (a) { try { return a = a ? J(v, a) : "", wb(a), 0 } catch (b) { if ("undefined" == typeof W || "ErrnoError" !== b.name) throw b; return -b.Ob } }, H: function (a, b) { try { return a = a ? J(v, a) : "", Jb(xb, a, b) } catch (c) { if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c; return -c.Ob } }, r: function (a, b, c) {
          try {
            b = b ? J(v, b) : ""; b = Ib(a, b); if (0 === c) {
              a = b; var d = S(a, { parent: !0 }).node; if (!d) throw new O(44); var f = La(a), h = Q(d, f), g = ob(d, f, !1); if (g) throw new O(g);
              if (!d.Cb.unlink) throw new O(63); if (h.Xb) throw new O(10); d.Cb.unlink(d, f); jb(h)
            } else 512 === c ? wb(b) : p("Invalid flags passed to unlinkat"); return 0
          } catch (n) { if ("undefined" == typeof W || "ErrnoError" !== n.name) throw n; return -n.Ob }
        }, q: function (a, b, c) {
          try { b = b ? J(v, b) : ""; b = Ib(a, b, !0); if (c) { var d = y[c >> 2] + 4294967296 * x[c + 4 >> 2], f = x[c + 8 >> 2]; h = 1E3 * d + f / 1E6; c += 16; d = y[c >> 2] + 4294967296 * x[c + 4 >> 2]; f = x[c + 8 >> 2]; g = 1E3 * d + f / 1E6 } else var h = Date.now(), g = h; a = h; var n = S(b, { Vb: !0 }).node; n.Cb.Qb(n, { timestamp: Math.max(a, g) }); return 0 } catch (k) {
            if ("undefined" ==
              typeof W || "ErrnoError" !== k.name) throw k; return -k.Ob
          }
        }, l: function (a, b, c) {
          a = new Date(1E3 * Mb(a, b)); x[c >> 2] = a.getSeconds(); x[c + 4 >> 2] = a.getMinutes(); x[c + 8 >> 2] = a.getHours(); x[c + 12 >> 2] = a.getDate(); x[c + 16 >> 2] = a.getMonth(); x[c + 20 >> 2] = a.getFullYear() - 1900; x[c + 24 >> 2] = a.getDay(); b = a.getFullYear(); x[c + 28 >> 2] = (0 !== b % 4 || 0 === b % 100 && 0 !== b % 400 ? Ob : Nb)[a.getMonth()] + a.getDate() - 1 | 0; x[c + 36 >> 2] = -(60 * a.getTimezoneOffset()); b = (new Date(a.getFullYear(), 6, 1)).getTimezoneOffset(); var d = (new Date(a.getFullYear(), 0, 1)).getTimezoneOffset();
          x[c + 32 >> 2] = (b != d && a.getTimezoneOffset() == Math.min(d, b)) | 0
        }, i: function (a, b, c, d, f, h, g, n) { f = Mb(f, h); try { if (isNaN(f)) return 61; var k = U(d); if (0 !== (b & 2) && 0 === (c & 2) && 2 !== (k.flags & 2097155)) throw new O(2); if (1 === (k.flags & 2097155)) throw new O(2); if (!k.Mb.cc) throw new O(43); var l = k.Mb.cc(k, a, f, b, c); var r = l.uc; x[g >> 2] = l.pc; y[n >> 2] = r; return 0 } catch (m) { if ("undefined" == typeof W || "ErrnoError" !== m.name) throw m; return -m.Ob } }, j: function (a, b, c, d, f, h, g) {
          h = Mb(h, g); try {
            if (isNaN(h)) return 61; var n = U(f); if (c & 2) {
              if (32768 !==
                (n.node.mode & 61440)) throw new O(43); if (!(d & 2)) { var k = v.slice(a, a + b); n.Mb.dc && n.Mb.dc(n, k, h, b, d) }
            }
          } catch (l) { if ("undefined" == typeof W || "ErrnoError" !== l.name) throw l; return -l.Ob }
        }, s: (a, b, c) => {
          function d(k) { return (k = k.toTimeString().match(/\(([A-Za-z ]+)\)$/)) ? k[1] : "GMT" } var f = (new Date).getFullYear(), h = new Date(f, 0, 1), g = new Date(f, 6, 1); f = h.getTimezoneOffset(); var n = g.getTimezoneOffset(); y[a >> 2] = 60 * Math.max(f, n); x[b >> 2] = Number(f != n); a = d(h); b = d(g); a = Qb(a); b = Qb(b); n < f ? (y[c >> 2] = a, y[c + 4 >> 2] = b) : (y[c >> 2] = b,
            y[c + 4 >> 2] = a)
        }, e: function () { return Date.now() }, d: () => performance.now(), o: a => { var b = v.length; a >>>= 0; if (2147483648 < a) return !1; for (var c = 1; 4 >= c; c *= 2) { var d = b * (1 + .2 / c); d = Math.min(d, a + 100663296); var f = Math; d = Math.max(a, d); a: { f = f.min.call(f, 2147483648, d + (65536 - d % 65536) % 65536) - oa.buffer.byteLength + 65535 >>> 16; try { oa.grow(f); ta(); var h = 1; break a } catch (g) { } h = void 0 } if (h) return !0 } return !1 }, A: (a, b) => {
          var c = 0; Tb().forEach(function (d, f) {
            var h = b + c; f = y[a + 4 * f >> 2] = h; for (h = 0; h < d.length; ++h)u[f++ >> 0] = d.charCodeAt(h);
            u[f >> 0] = 0; c += d.length + 1
          }); return 0
        }, B: (a, b) => { var c = Tb(); y[a >> 2] = c.length; var d = 0; c.forEach(function (f) { d += f.length + 1 }); y[b >> 2] = d; return 0 }, f: function (a) { try { var b = U(a); if (null === b.fd) throw new O(8); b.ec && (b.ec = null); try { b.Mb.close && b.Mb.close(b) } catch (c) { throw c; } finally { db[b.fd] = null } b.fd = null; return 0 } catch (c) { if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c; return c.Ob } }, p: function (a, b) {
          try {
            var c = U(a); u[b >> 0] = c.tty ? 2 : 16384 === (c.mode & 61440) ? 3 : 40960 === (c.mode & 61440) ? 7 : 4; qa[b + 2 >> 1] = 0; E = [0,
              (C = 0, 1 <= +Math.abs(C) ? 0 < C ? +Math.floor(C / 4294967296) >>> 0 : ~~+Math.ceil((C - +(~~C >>> 0)) / 4294967296) >>> 0 : 0)]; x[b + 8 >> 2] = E[0]; x[b + 12 >> 2] = E[1]; E = [0, (C = 0, 1 <= +Math.abs(C) ? 0 < C ? +Math.floor(C / 4294967296) >>> 0 : ~~+Math.ceil((C - +(~~C >>> 0)) / 4294967296) >>> 0 : 0)]; x[b + 16 >> 2] = E[0]; x[b + 20 >> 2] = E[1]; return 0
          } catch (d) { if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d; return d.Ob }
        }, x: function (a, b, c, d) {
          try {
            a: {
              var f = U(a); a = b; for (var h, g = b = 0; g < c; g++) {
                var n = y[a >> 2], k = y[a + 4 >> 2]; a += 8; var l = f, r = n, m = k, q = h, w = u; if (0 > m || 0 > q) throw new O(28);
                if (null === l.fd) throw new O(8); if (1 === (l.flags & 2097155)) throw new O(8); if (16384 === (l.node.mode & 61440)) throw new O(31); if (!l.Mb.read) throw new O(28); var z = "undefined" != typeof q; if (!z) q = l.position; else if (!l.seekable) throw new O(70); var F = l.Mb.read(l, w, r, m, q); z || (l.position += F); var D = F; if (0 > D) { var K = -1; break a } b += D; if (D < k) break; "undefined" !== typeof h && (h += D)
              } K = b
            } y[d >> 2] = K; return 0
          } catch (G) { if ("undefined" == typeof W || "ErrnoError" !== G.name) throw G; return G.Ob }
        }, m: function (a, b, c, d, f) {
          b = Mb(b, c); try {
            if (isNaN(b)) return 61;
            var h = U(a); Db(h, b, d); E = [h.position >>> 0, (C = h.position, 1 <= +Math.abs(C) ? 0 < C ? +Math.floor(C / 4294967296) >>> 0 : ~~+Math.ceil((C - +(~~C >>> 0)) / 4294967296) >>> 0 : 0)]; x[f >> 2] = E[0]; x[f + 4 >> 2] = E[1]; h.ec && 0 === b && 0 === d && (h.ec = null); return 0
          } catch (g) { if ("undefined" == typeof W || "ErrnoError" !== g.name) throw g; return g.Ob }
        }, D: function (a) {
          try { var b = U(a); return Uc(function (c) { var d = b.node.Sb; d.type.wc ? d.type.wc(d, !1, function (f) { f ? c(function () { return 29 }) : c(0) }) : c(0) }) } catch (c) {
            if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c;
            return c.Ob
          }
        }, t: function (a, b, c, d) {
          try {
            a: {
              var f = U(a); a = b; for (var h, g = b = 0; g < c; g++) {
                var n = y[a >> 2], k = y[a + 4 >> 2]; a += 8; var l = f, r = n, m = k, q = h, w = u; if (0 > m || 0 > q) throw new O(28); if (null === l.fd) throw new O(8); if (0 === (l.flags & 2097155)) throw new O(8); if (16384 === (l.node.mode & 61440)) throw new O(31); if (!l.Mb.write) throw new O(28); l.seekable && l.flags & 1024 && Db(l, 0, 2); var z = "undefined" != typeof q; if (!z) q = l.position; else if (!l.seekable) throw new O(70); var F = l.Mb.write(l, w, r, m, q, void 0); z || (l.position += F); var D = F; if (0 > D) {
                  var K =
                    -1; break a
                } b += D; "undefined" !== typeof h && (h += D)
              } K = b
            } y[d >> 2] = K; return 0
          } catch (G) { if ("undefined" == typeof W || "ErrnoError" !== G.name) throw G; return G.Ob }
        }, ra: Ub, N: Vb, ga: Wb, ca: Xb, Y: Yb, la: Zb, G: $b, h: ac, oa: bc, ja: cc, ea: dc, fa: ec, k: fc, v: gc, pa: hc, g: ic, qa: jc, da: kc, ha: lc, ia: mc, na: nc, c: oc, ka: pc, ma: qc, aa: rc, V: sc, $: tc, ba: uc, S: vc, U: wc, Z: xc, X: yc, R: zc, Q: Ac, T: Bc, _: Cc, O: Dc, W: Ec, P: Fc
      };
      (function () { function a(c) { c = c.exports; c = Jc(c); e.asm = c; oa = e.asm.sa; ta(); va.unshift(e.asm.ta); A--; e.monitorRunDependencies && e.monitorRunDependencies(A); if (0 == A && (null !== Aa && (clearInterval(Aa), Aa = null), Ba)) { var d = Ba; Ba = null; d() } return c } var b = { a: ed }; A++; e.monitorRunDependencies && e.monitorRunDependencies(A); if (e.instantiateWasm) try { return e.instantiateWasm(b, a) } catch (c) { ma("Module.instantiateWasm callback failed with error: " + c), ba(c) } Fa(b, function (c) { a(c.instance) }).catch(ba); return {} })();
      e._sqlite3_vfs_find = function () { return (e._sqlite3_vfs_find = e.asm.ua).apply(null, arguments) }; e._sqlite3_malloc = function () { return (e._sqlite3_malloc = e.asm.va).apply(null, arguments) }; e._sqlite3_free = function () { return (e._sqlite3_free = e.asm.wa).apply(null, arguments) }; e._sqlite3_prepare_v2 = function () { return (e._sqlite3_prepare_v2 = e.asm.xa).apply(null, arguments) }; e._sqlite3_step = function () { return (e._sqlite3_step = e.asm.ya).apply(null, arguments) };
      e._sqlite3_column_int64 = function () { return (e._sqlite3_column_int64 = e.asm.za).apply(null, arguments) }; e._sqlite3_column_int = function () { return (e._sqlite3_column_int = e.asm.Aa).apply(null, arguments) }; e._sqlite3_finalize = function () { return (e._sqlite3_finalize = e.asm.Ba).apply(null, arguments) }; e._sqlite3_reset = function () { return (e._sqlite3_reset = e.asm.Ca).apply(null, arguments) }; e._sqlite3_clear_bindings = function () { return (e._sqlite3_clear_bindings = e.asm.Da).apply(null, arguments) };
      e._sqlite3_value_blob = function () { return (e._sqlite3_value_blob = e.asm.Ea).apply(null, arguments) }; e._sqlite3_value_text = function () { return (e._sqlite3_value_text = e.asm.Fa).apply(null, arguments) }; e._sqlite3_value_bytes = function () { return (e._sqlite3_value_bytes = e.asm.Ga).apply(null, arguments) }; e._sqlite3_value_double = function () { return (e._sqlite3_value_double = e.asm.Ha).apply(null, arguments) }; e._sqlite3_value_int = function () { return (e._sqlite3_value_int = e.asm.Ia).apply(null, arguments) };
      e._sqlite3_value_int64 = function () { return (e._sqlite3_value_int64 = e.asm.Ja).apply(null, arguments) }; e._sqlite3_value_type = function () { return (e._sqlite3_value_type = e.asm.Ka).apply(null, arguments) }; e._sqlite3_result_blob = function () { return (e._sqlite3_result_blob = e.asm.La).apply(null, arguments) }; e._sqlite3_result_double = function () { return (e._sqlite3_result_double = e.asm.Ma).apply(null, arguments) }; e._sqlite3_result_error = function () { return (e._sqlite3_result_error = e.asm.Na).apply(null, arguments) };
      e._sqlite3_result_int = function () { return (e._sqlite3_result_int = e.asm.Oa).apply(null, arguments) }; e._sqlite3_result_int64 = function () { return (e._sqlite3_result_int64 = e.asm.Pa).apply(null, arguments) }; e._sqlite3_result_null = function () { return (e._sqlite3_result_null = e.asm.Qa).apply(null, arguments) }; e._sqlite3_result_text = function () { return (e._sqlite3_result_text = e.asm.Ra).apply(null, arguments) }; e._sqlite3_column_count = function () { return (e._sqlite3_column_count = e.asm.Sa).apply(null, arguments) };
      e._sqlite3_data_count = function () { return (e._sqlite3_data_count = e.asm.Ta).apply(null, arguments) }; e._sqlite3_column_blob = function () { return (e._sqlite3_column_blob = e.asm.Ua).apply(null, arguments) }; e._sqlite3_column_bytes = function () { return (e._sqlite3_column_bytes = e.asm.Va).apply(null, arguments) }; e._sqlite3_column_double = function () { return (e._sqlite3_column_double = e.asm.Wa).apply(null, arguments) }; e._sqlite3_column_text = function () { return (e._sqlite3_column_text = e.asm.Xa).apply(null, arguments) };
      e._sqlite3_column_type = function () { return (e._sqlite3_column_type = e.asm.Ya).apply(null, arguments) }; e._sqlite3_column_name = function () { return (e._sqlite3_column_name = e.asm.Za).apply(null, arguments) }; e._sqlite3_bind_blob = function () { return (e._sqlite3_bind_blob = e.asm._a).apply(null, arguments) }; e._sqlite3_bind_double = function () { return (e._sqlite3_bind_double = e.asm.$a).apply(null, arguments) }; e._sqlite3_bind_int = function () { return (e._sqlite3_bind_int = e.asm.ab).apply(null, arguments) };
      e._sqlite3_bind_int64 = function () { return (e._sqlite3_bind_int64 = e.asm.bb).apply(null, arguments) }; e._sqlite3_bind_null = function () { return (e._sqlite3_bind_null = e.asm.cb).apply(null, arguments) }; e._sqlite3_bind_text = function () { return (e._sqlite3_bind_text = e.asm.db).apply(null, arguments) }; e._sqlite3_bind_parameter_count = function () { return (e._sqlite3_bind_parameter_count = e.asm.eb).apply(null, arguments) }; e._sqlite3_bind_parameter_name = function () { return (e._sqlite3_bind_parameter_name = e.asm.fb).apply(null, arguments) };
      e._sqlite3_sql = function () { return (e._sqlite3_sql = e.asm.gb).apply(null, arguments) }; e._sqlite3_exec = function () { return (e._sqlite3_exec = e.asm.hb).apply(null, arguments) }; e._sqlite3_errmsg = function () { return (e._sqlite3_errmsg = e.asm.ib).apply(null, arguments) }; e._sqlite3_declare_vtab = function () { return (e._sqlite3_declare_vtab = e.asm.jb).apply(null, arguments) }; e._sqlite3_libversion = function () { return (e._sqlite3_libversion = e.asm.kb).apply(null, arguments) };
      e._sqlite3_libversion_number = function () { return (e._sqlite3_libversion_number = e.asm.lb).apply(null, arguments) }; e._sqlite3_changes = function () { return (e._sqlite3_changes = e.asm.mb).apply(null, arguments) }; e._sqlite3_close = function () { return (e._sqlite3_close = e.asm.nb).apply(null, arguments) }; e._sqlite3_limit = function () { return (e._sqlite3_limit = e.asm.ob).apply(null, arguments) }; e._sqlite3_open_v2 = function () { return (e._sqlite3_open_v2 = e.asm.pb).apply(null, arguments) };
      e._sqlite3_get_autocommit = function () { return (e._sqlite3_get_autocommit = e.asm.qb).apply(null, arguments) }; function dd() { return (dd = e.asm.rb).apply(null, arguments) } var Pb = e._malloc = function () { return (Pb = e._malloc = e.asm.sb).apply(null, arguments) }, Yc = e._free = function () { return (Yc = e._free = e.asm.tb).apply(null, arguments) }; e._RegisterExtensionFunctions = function () { return (e._RegisterExtensionFunctions = e.asm.ub).apply(null, arguments) }; e._set_authorizer = function () { return (e._set_authorizer = e.asm.vb).apply(null, arguments) };
      e._create_function = function () { return (e._create_function = e.asm.wb).apply(null, arguments) }; e._create_module = function () { return (e._create_module = e.asm.xb).apply(null, arguments) }; e._progress_handler = function () { return (e._progress_handler = e.asm.yb).apply(null, arguments) }; e._register_vfs = function () { return (e._register_vfs = e.asm.zb).apply(null, arguments) }; e._getSqliteFree = function () { return (e._getSqliteFree = e.asm.Ab).apply(null, arguments) }; var fd = e._main = function () { return (fd = e._main = e.asm.Bb).apply(null, arguments) };
      function $a() { return ($a = e.asm.Db).apply(null, arguments) } function gd() { return (gd = e.asm.Eb).apply(null, arguments) } function cd() { return (cd = e.asm.Fb).apply(null, arguments) } function ad() { return (ad = e.asm.Gb).apply(null, arguments) } function bd() { return (bd = e.asm.Hb).apply(null, arguments) } function Wc() { return (Wc = e.asm.Ib).apply(null, arguments) } function Lc() { return (Lc = e.asm.Jb).apply(null, arguments) } function Vc() { return (Vc = e.asm.Kb).apply(null, arguments) }
      function Xc() { return (Xc = e.asm.Lb).apply(null, arguments) } e.getTempRet0 = gd; e.ccall = Z; e.cwrap = function (a, b, c, d) { var f = !c || c.every(h => "number" === h || "boolean" === h); return "string" !== b && f && !d ? e["_" + a] : function () { return Z(a, b, c, arguments, d) } }; e.setValue = I; e.getValue = H; e.UTF8ToString = (a, b) => a ? J(v, a, b) : ""; e.stringToUTF8 = (a, b, c) => N(a, v, b, c); e.lengthBytesUTF8 = M; var hd; Ba = function jd() { hd || kd(); hd || (Ba = jd) };
      function kd() {
        function a() {
          if (!hd && (hd = !0, e.calledRun = !0, !t)) {
            e.noFSInit || Fb || (Fb = !0, Eb(), e.stdin = e.stdin, e.stdout = e.stdout, e.stderr = e.stderr, e.stdin ? Hb("stdin", e.stdin) : vb("/dev/tty", "/dev/stdin"), e.stdout ? Hb("stdout", null, e.stdout) : vb("/dev/tty", "/dev/stdout"), e.stderr ? Hb("stderr", null, e.stderr) : vb("/dev/tty1", "/dev/stderr"), Cb("/dev/stdin", 0), Cb("/dev/stdout", 1), Cb("/dev/stderr", 1)); fb = !1; Ha(va); Ha(wa); aa(e); if (e.onRuntimeInitialized) e.onRuntimeInitialized(); if (ld) {
              var b = fd; try {
                var c = b(0, 0); pa =
                  c; Gc(c)
              } catch (d) { Hc(d) }
            } if (e.postRun) for ("function" == typeof e.postRun && (e.postRun = [e.postRun]); e.postRun.length;)b = e.postRun.shift(), xa.unshift(b); Ha(xa)
          }
        } if (!(0 < A)) { if (e.preRun) for ("function" == typeof e.preRun && (e.preRun = [e.preRun]); e.preRun.length;)za(); Ha(ua); 0 < A || (e.setStatus ? (e.setStatus("Running..."), setTimeout(function () { setTimeout(function () { e.setStatus("") }, 1); a() }, 1)) : a()) }
      } if (e.preInit) for ("function" == typeof e.preInit && (e.preInit = [e.preInit]); 0 < e.preInit.length;)e.preInit.pop()();
      var ld = !0; e.noInitialRun && (ld = !1); kd();


      return moduleArg.ready
    }

  );
})();
export default Module;