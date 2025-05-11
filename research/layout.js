(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
    [185],
    {
        58382: function (e, t, n) {
            Promise.resolve().then(n.bind(n, 32944)),
                Promise.resolve().then(n.t.bind(n, 74258, 23)),
                Promise.resolve().then(n.bind(n, 11299)),
                Promise.resolve().then(n.t.bind(n, 53054, 23));
        },
        16463: function (e, t, n) {
            "use strict";
            var a = n(71169);
            n.o(a, "useParams") &&
                n.d(t, {
                    useParams: function () {
                        return a.useParams;
                    },
                }),
                n.o(a, "usePathname") &&
                    n.d(t, {
                        usePathname: function () {
                            return a.usePathname;
                        },
                    }),
                n.o(a, "useRouter") &&
                    n.d(t, {
                        useRouter: function () {
                            return a.useRouter;
                        },
                    }),
                n.o(a, "useSearchParams") &&
                    n.d(t, {
                        useSearchParams: function () {
                            return a.useSearchParams;
                        },
                    });
        },
        11299: function (e, t, n) {
            "use strict";
            n.d(t, {
                default: function () {
                    return o;
                },
            });
            var a = n(42575),
                r = n(2265);
            let i = [...a.Z.map((e) => e.image)];
            function o() {
                return (
                    (0, r.useEffect)(() => {
                        i.map((e) => {
                            new Image().src = e;
                        });
                    }, []),
                    null
                );
            }
        },
        42575: function (e, t) {
            "use strict";
            t.Z = [
                { id: "kevin", image: "kevin.png" },
                { id: "kev4kev", image: "kev4kev.gif" },
                { id: "eyeofkev", image: "eyeofkev.gif" },
                { id: "buffgus", image: "buffgus.gif" },
                { id: "mrbean", image: "mrbean.gif" },
                { id: "ballsexplode", image: "ballsexplode.jpg" },
                { id: "schizo", image: "schizo.gif" },
                { id: "betamale", image: "betamale.png" },
                { id: "wtf", image: "lennonstare.gif" },
                { id: "LEONSTARE", image: "LEONSTARE.png" },
                { id: "LEONSTARE2", image: "leonstare2.jpg" },
                { id: "JOSHSTARE", image: "JOSHSTARE.png" },
                { id: "joshmog", image: "josh-mg.jpg" },
                { id: "lockedin", image: "lockedin.gif" },
                { id: "bidenblast", image: "bidenblast.png" },
                { id: "skull", image: "skull.png" },
                { id: "freakytree", image: "freakytree.gif" },
                { id: "60", image: "60.png" },
                { id: "hush", image: "hush.png" },
            ];
        },
        53054: function () {},
        74258: function (e) {
            e.exports = {
                style: { fontFamily: "'__FixedSys_744011', '__FixedSys_Fallback_744011'" },
                className: "__className_744011",
            };
        },
        32944: function (e, t, n) {
            "use strict";
            n.d(t, {
                Analytics: function () {
                    return m;
                },
            });
            var a = n(2265),
                r = n(16463),
                i = () => {
                    window.va ||
                        (window.va = function () {
                            for (var e = arguments.length, t = Array(e), n = 0; n < e; n++) t[n] = arguments[n];
                            (window.vaq = window.vaq || []).push(t);
                        });
                };
            function o() {
                return "undefined" != typeof window;
            }
            function s() {
                return "production";
            }
            function u() {
                return "development" === ((o() ? window.vam : s()) || "production");
            }
            function c(e) {
                return new RegExp("/".concat(e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "(?=[/?#]|$)"));
            }
            function l(e) {
                return (
                    (0, a.useEffect)(() => {
                        !(function () {
                            var e;
                            let t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : { debug: !0 };
                            if (!o()) return;
                            (function () {
                                let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "auto";
                                if ("auto" === e) {
                                    window.vam = s();
                                    return;
                                }
                                window.vam = e;
                            })(t.mode),
                                i(),
                                t.beforeSend && (null == (e = window.va) || e.call(window, "beforeSend", t.beforeSend));
                            let n =
                                t.scriptSrc ||
                                (u()
                                    ? "https://va.vercel-scripts.com/v1/script.debug.js"
                                    : "/_vercel/insights/script.js");
                            if (document.head.querySelector('script[src*="'.concat(n, '"]'))) return;
                            let a = document.createElement("script");
                            (a.src = n),
                                (a.defer = !0),
                                (a.dataset.sdkn = "@vercel/analytics" + (t.framework ? "/".concat(t.framework) : "")),
                                (a.dataset.sdkv = "1.3.1"),
                                t.disableAutoTrack && (a.dataset.disableAutoTrack = "1"),
                                t.endpoint && (a.dataset.endpoint = t.endpoint),
                                t.dsn && (a.dataset.dsn = t.dsn),
                                (a.onerror = () => {
                                    let e = u()
                                        ? "Please check if any ad blockers are enabled and try again."
                                        : "Be sure to enable Web Analytics for your project and deploy again. See https://vercel.com/docs/analytics/quickstart for more information.";
                                    console.log(
                                        "[Vercel Web Analytics] Failed to load script from ".concat(n, ". ").concat(e)
                                    );
                                }),
                                u() && !1 === t.debug && (a.dataset.debug = "false"),
                                document.head.appendChild(a);
                        })({
                            framework: e.framework || "react",
                            ...(void 0 !== e.route && { disableAutoTrack: !0 }),
                            ...e,
                        });
                    }, []),
                    (0, a.useEffect)(() => {
                        e.route &&
                            e.path &&
                            (function (e) {
                                var t;
                                let { route: n, path: a } = e;
                                null == (t = window.va) || t.call(window, "pageview", { route: n, path: a });
                            })({ route: e.route, path: e.path });
                    }, [e.route, e.path]),
                    null
                );
            }
            var d = () => {
                let e = (0, r.useParams)(),
                    t = (0, r.useSearchParams)(),
                    n = (0, r.usePathname)(),
                    a = { ...Object.fromEntries(t.entries()), ...(e || {}) };
                return {
                    route: e
                        ? (function (e, t) {
                              if (!e || !t) return e;
                              let n = e;
                              try {
                                  let e = Object.entries(t);
                                  for (let [t, a] of e)
                                      if (!Array.isArray(a)) {
                                          let e = c(a);
                                          e.test(n) && (n = n.replace(e, "/[".concat(t, "]")));
                                      }
                                  for (let [t, a] of e)
                                      if (Array.isArray(a)) {
                                          let e = c(a.join("/"));
                                          e.test(n) && (n = n.replace(e, "/[...".concat(t, "]")));
                                      }
                                  return n;
                              } catch (t) {
                                  return e;
                              }
                          })(n, a)
                        : null,
                    path: n,
                };
            };
            function f(e) {
                let { route: t, path: n } = d();
                return a.createElement(l, { path: n, route: t, ...e, framework: "next" });
            }
            function m(e) {
                return a.createElement(a.Suspense, { fallback: null }, a.createElement(f, { ...e }));
            }
        },
    },
    function (e) {
        e.O(0, [322, 971, 23, 744], function () {
            return e((e.s = 58382));
        }),
            (_N_E = e.O());
    },
]);
