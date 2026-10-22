import type { Role } from "../shared/types";
import { ROLES } from "../shared/content";
import { careerPortrait40 } from "./game/humanArt40";
import { Icon } from "./icons";

/** The selected worker's identity stays visible while browsing the roster. */
export function ProfessionCard({ role }: { role: Role }) {
  const job = ROLES[role];
  return (
    <article className="profession-card" aria-label={job.name + "职业工牌"}>
      <div className="profession-portrait">
        <img src={careerPortrait40(role)} alt="" draggable={false} />
        <Icon name="fish" size={18} />
      </div>
      <div className="profession-identity">
        <h3>{job.name}</h3>
        <p>{job.desc}</p>
        <dl>
          <div>
            <dt>生命</dt>
            <dd>{job.hp}</dd>
          </div>
          <div>
            <dt>移速</dt>
            <dd>{job.speed}</dd>
          </div>
          <div>
            <dt>冷却</dt>
            <dd>{job.cooldown}s</dd>
          </div>
        </dl>
        <span className="profession-signature">
          <kbd>Q</kbd>
          {job.skill}
        </span>
      </div>
    </article>
  );
}
