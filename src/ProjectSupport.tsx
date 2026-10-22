import { Icon } from "./icons";
export const PROJECT_URL = "https://github.com/1045857717/off-duty-squad";
export function ProjectLinks() {
  return (
    <nav className="project-links" aria-label="GitHub开源项目入口">
      <a
        href={PROJECT_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub开源项目"
        title="GitHub开源项目"
      >
        <Icon name="github" size={16} />
        <span>GitHub</span>
      </a>
    </nav>
  );
}
