import { fetchJSON, renderProjects, fetchGitHubData} from './global.js';
async function loadLatestProjects() {
    const projects = await fetchJSON('./lib/projects.json');
    const latestProjects = projects.slice(0, 3);
    
    const projectsContainer = document.querySelector('.projects');

    renderProjects(latestProjects, projectsContainer, 'h2');
  }

async function loadGitHubData() {
    const githubData = await fetchGitHubData('Shou-Yue');
    console.log(githubData);
  
    const profileStats = document.querySelector('#profile-stats');
  
    if (profileStats && githubData) {
      profileStats.innerHTML = `
        <dl style="display: grid; grid-template-columns: repeat(4, 1fr); grid-gap: 10px;">
          <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers:</dt><dd>${githubData.followers}</dd>
          <dt>Following:</dt><dd>${githubData.following}</dd>
        </dl>
      `;
    }
  }
  
  loadGitHubData();
  loadLatestProjects();
  
  
  