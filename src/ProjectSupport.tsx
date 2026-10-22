import { Icon } from "./icons";
import { Modal } from "./components";
export const PROJECT_URL = "https://github.com/1045857717/off-duty-squad";
export function ProjectLinks({ onCoffee }: { onCoffee: () => void }) {
  return (
    <nav className="project-links" aria-label="开源项目与支持">
      <a
        href={PROJECT_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub开源项目"
        title="GitHub 开源项目"
      >
        <Icon name="github" size={16} />
        <span>GitHub</span>
      </a>
      <button
        type="button"
        aria-label="请作者喝咖啡"
        title="请作者喝咖啡"
        onClick={onCoffee}
      >
        <Icon name="cup" size={16} />
        <span>请作者喝咖啡</span>
      </button>
    </nav>
  );
}
export function CoffeeSupport({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="给下班续一杯"
      eyebrow="COFFEE / 谢谢支持"
      onClose={onClose}
      wide
    >
      <section className="coffee-support" aria-label="请作者喝咖啡">
        <div className="coffee-receipt">
          <Icon name="cup" size={24} />
          <span>自愿投喂 · 快乐续航</span>
          <h3>
            把老板画的饼，
            <br />
            换成一杯真咖啡。
          </h3>
          <p>
            喜欢这个项目的话，可以请作者喝杯咖啡。支持不解锁战力，打工人全靠自己发癫。
          </p>
        </div>
        <div className="coffee-qr">
          <a
            href="/wechat-coffee.png"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="查看完整微信收款二维码"
          >
            <img
              src="/wechat-coffee.png"
              alt="作者提供的微信收款二维码"
              width="1272"
              height="1640"
            />
          </a>
          <span>
            <Icon name="shield" size={13} />
            微信扫码 · 金额由你决定
          </span>
          <a
            href="/wechat-coffee.png"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看完整收款码 ↗
          </a>
        </div>
        <p className="coffee-thanks">
          不投喂也欢迎来玩、提建议、点 Star。祝大家早下班，少开会。
        </p>
      </section>
    </Modal>
  );
}
