// The tree before anyone has joined (owner: FAMILY). docs/app/FAMILY.md section 4: you with
// the You sticker beside the dashed Add a relative circle, and two ways to start.
import { Button } from '../ui/Button.jsx'
import { Head } from '../ui/Head.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Face, FaceSticker } from './Person.jsx'
import s from './EmptyTree.module.css'

export default function EmptyTree({ me, canWrite, onAdd, onAddTag }) {
  return (
    <section className={s.empty} data-ui="family-empty" data-tree-state="grown">
      <div className={s.pair}>
        <div className={s.me}>
          <span>
            <Face name={me.name} src={me.avatar} size={88} you />
            <FaceSticker kind="you" />
          </span>
          <span className={s.name}>{me.first}</span>
        </div>
        {canWrite ? (
          <div className={s.add}>
            <button type="button" className={s.addDisc} onClick={onAdd} aria-label="Add a relative">
              <Icon name="plus" size={30} />
            </button>
            <span className={s.name} aria-hidden="true">Add a relative</span>
          </div>
        ) : null}
      </div>
      <Head as="h2" size="section" before="Grow your family" mark="tree" after="." />
      <p className={s.body}>Add the people you love. Once they confirm, they join your tree. Children and pets join without an account.</p>
      {canWrite ? (
        <div className={s.buttons}>
          <Button icon="plus" onClick={onAdd}>
            Add a relative
          </Button>
          <Button variant="ghost" onClick={onAddTag}>
            Add a child or a pet
          </Button>
        </div>
      ) : null}
    </section>
  )
}
