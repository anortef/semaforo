import { Router } from "express";
import type { AddAppMember } from "../../../application/AddAppMember.js";
import type { RemoveAppMember } from "../../../application/RemoveAppMember.js";
import type { ListAppMembers } from "../../../application/ListAppMembers.js";
import type { UserRepository } from "@semaforo/domain";
import type { RecordAuditEvent } from "../../../application/admin/RecordAuditEvent.js";

export function appMemberRoutes(
  addMember: AddAppMember,
  removeMember: RemoveAppMember,
  listMembers: ListAppMembers,
  userRepository: UserRepository,
  audit?: RecordAuditEvent
): Router {
  const router = Router();

  router.get("/:appId/members", async (req, res) => {
    try {
      const members = await listMembers.execute(req.params.appId);
      const enriched = await Promise.all(
        members.map(async (m) => {
          const user = await userRepository.findById(m.userId);
          return {
            id: m.id,
            appId: m.appId,
            userId: m.userId,
            role: m.role,
            email: user?.email ?? "unknown",
            name: user?.name ?? "unknown",
            createdAt: m.createdAt,
          };
        })
      );
      res.json(enriched);
    } catch {
      res.status(500).json({ error: "Failed to list members" });
    }
  });

  router.post("/:appId/members", async (req, res) => {
    try {
      const member = await addMember.execute({
        appId: req.params.appId,
        userId: req.body.userId,
        role: req.body.role,
      });
      audit?.execute({
        userId: res.locals.userId,
        action: "member.added",
        resourceType: "app",
        resourceId: req.params.appId,
        details: JSON.stringify({ memberId: member.userId, role: member.role }),
      });
      res.status(201).json(member);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to add member";
      res.status(400).json({ error: msg });
    }
  });

  router.delete("/:appId/members/:memberId", async (req, res) => {
    try {
      await removeMember.execute(req.params.memberId);
      audit?.execute({
        userId: res.locals.userId,
        action: "member.removed",
        resourceType: "app",
        resourceId: req.params.appId,
        details: JSON.stringify({ memberId: req.params.memberId }),
      });
      res.status(204).send();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to remove member";
      const status = msg.includes("not found") ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  });

  return router;
}
