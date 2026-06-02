import projectsData from './projects.json' assert { type: 'json' };

let projectButton = document.querySelector('button');
let project1 = document.querySelector('#project1');
projectButton.addEventListener('click', () => {
    let projectSection = document.querySelector('#project-list');
    projectSection.style.display = 'block';
    projectSection.scrollIntoView({ behavior: 'smooth' });
});

