import { useOfficeStore } from '../store/officeStore'
import { AgentAvatar } from './AgentAvatar'

export function Agents() {
  const agents = useOfficeStore((s) => s.agents)
  return (
    <group>
      {agents.map((a) => (
        <AgentAvatar key={a.id} agent={a} />
      ))}
    </group>
  )
}
