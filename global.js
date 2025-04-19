export function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }
  
const pages = [
  { url: "",           title: "Home"     },
  { url: "projects/",  title: "Projects" },
  { url: "contact/",   title: "Contact"  },
  { url: "resume/",    title: "Resume"   },
];

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const repo = location.pathname.split("/")[1] || "";
const BASE_PATH = LOCAL_HOSTS.includes(location.hostname)
  ? "/"
  : `/${repo}/`;

const cleanPath = (p) =>
  p.replace(/\/index\.html$/, "/").replace(/^\/?/, "/");

const nav = document.createElement("nav");
document.body.prepend(nav);

for (const { url: rawURL, title } of pages) {
  const href = rawURL.startsWith("http")
    ? rawURL
    : BASE_PATH + rawURL;
  const a = document.createElement("a");
  a.href = href;
  a.textContent = title;

  if (a.host !== location.host) a.target = "_blank";

  const isCurrent =
    a.host === location.host &&
    cleanPath(a.pathname) === cleanPath(location.pathname);
  if (isCurrent) a.classList.add("current");

  nav.append(a);
}

document.body.insertAdjacentHTML(
    "afterbegin",
    `<label class="color-scheme">
        Theme:
        <select>
          <option value="light dark">Automatic</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>`
  );
  
  const select = document.querySelector(".color-scheme select");
  
  function setColorScheme(scheme) {
    const root = document.documentElement;
    if (scheme === "light dark") {
      root.style.removeProperty("color-scheme"); // fall back to CSS default
    } else {
      root.style.setProperty("color-scheme", scheme);
    }
    select.value = scheme;
  }
  
  setColorScheme(localStorage.colorScheme ?? "light dark");
  
  select.addEventListener("input", (e) => {
    const scheme = e.target.value;
    localStorage.colorScheme = scheme;
    setColorScheme(scheme);
  });

  /* ---------- 3.  CONTACT‑FORM “mailto:” HANDLER --------------- */

const form = document.querySelector('form[action^="mailto:"]');  // only on contact page

form?.addEventListener("submit", (e) => {
  e.preventDefault();                               // stop the default GET

  const data   = new FormData(form);
  const params = [];

  for (const [name, value] of data) {
    params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }

  const url = form.action + "?" + params.join("&"); // e.g. mailto:me@site.com?subject=…&body=…
  location.href = url;                              // opens the user’s mail client
});
