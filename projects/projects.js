import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
  const projects = await fetchJSON('../lib/projects.json');
  
  // Update the project count in the title
  const projectsTitle = document.querySelector('.projects-title');
  projectsTitle.textContent = `Projects (${projects.length})`; // Dynamically set the project count
  
  const projectsContainer = document.querySelector('.projects');
  renderProjects(projects, projectsContainer, 'h2');
}

loadProjects();
