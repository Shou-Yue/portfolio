export function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }
  
const pages = [
  { url: "",           title: "Home"     },
  { url: "projects/",  title: "Projects" },
  { url: "resume/",    title: "Resume"   },
  { url: "meta/",      title: "Meta"     },
  { url: "contact/",   title: "Contact"  },
];

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';

  if (projects.length === 0) {
    containerElement.innerHTML = '<p>No projects to display.</p>';
    return;
  }

  projects.forEach(project => {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <div class=Tproject-text">
        <p class="year">${project.year}</p>
        <p>${project.description}</p>
      </div>
      `;
    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) {
      throw new Error('Failed to fetch GitHub data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}


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
