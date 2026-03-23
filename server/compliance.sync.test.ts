import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

describe("Compliance Assessment Synchronization", () => {
  const testOrgId = 1;
  const testUserId = 1;
  const testAssessmentData = {
    organizationId: testOrgId,
    title: "Test Assessment",
    framework: "misto" as const,
    createdById: testUserId,
    totalQuestions: 0,
    answeredQuestions: 0,
  };

  describe("Create and List Synchronization", () => {
    it("should create a new compliance assessment and retrieve it", async () => {
      // Create assessment
      const assessmentId = await db.createComplianceAssessment(testAssessmentData);
      expect(assessmentId).toBeDefined();
      expect(typeof assessmentId).toBe("number");

      // Retrieve assessment
      const assessment = await db.getComplianceAssessmentById(assessmentId);
      expect(assessment).toBeDefined();
      expect(assessment?.id).toBe(assessmentId);
      expect(assessment?.title).toBe(testAssessmentData.title);
      expect(assessment?.organizationId).toBe(testOrgId);
      expect(assessment?.status).toBe("rascunho");
    });

    it("should list all assessments for an organization", async () => {
      // Create multiple assessments
      const id1 = await db.createComplianceAssessment({
        ...testAssessmentData,
        title: "Assessment 1",
      });
      const id2 = await db.createComplianceAssessment({
        ...testAssessmentData,
        title: "Assessment 2",
      });

      // List assessments
      const assessments = await db.getComplianceAssessmentsByOrganization(testOrgId);
      expect(assessments).toBeDefined();
      expect(assessments.length).toBeGreaterThanOrEqual(2);

      const titles = assessments.map((a) => a.title);
      expect(titles).toContain("Assessment 1");
      expect(titles).toContain("Assessment 2");
    });

    it("should update assessment status and persist changes", async () => {
      const assessmentId = await db.createComplianceAssessment(testAssessmentData);

      // Update status to em_andamento
      await db.updateComplianceAssessment(assessmentId, {
        status: "em_andamento",
        totalQuestions: 21,
        answeredQuestions: 5,
      });

      // Verify update
      const updated = await db.getComplianceAssessmentById(assessmentId);
      expect(updated?.status).toBe("em_andamento");
      expect(updated?.totalQuestions).toBe(21);
      expect(updated?.answeredQuestions).toBe(5);
    });
  });

  describe("Response Persistence", () => {
    let assessmentId: number;

    beforeEach(async () => {
      assessmentId = await db.createComplianceAssessment(testAssessmentData);
    });

    it("should save a compliance response", async () => {
      const responseData = {
        assessmentId,
        domainId: 1,
        questionId: "Q1",
        selectedLevel: 3,
        riskScore: 25,
        notes: "Test notes",
        evidenceUrls: [],
      };

      const responseId = await db.saveComplianceResponse(responseData);
      expect(responseId).toBeDefined();
      expect(typeof responseId).toBe("number");
    });

    it("should retrieve saved responses for an assessment", async () => {
      // Save multiple responses
      const response1 = {
        assessmentId,
        domainId: 1,
        questionId: "Q1",
        selectedLevel: 3,
        riskScore: 25,
        notes: "Notes 1",
        evidenceUrls: [],
      };

      const response2 = {
        assessmentId,
        domainId: 2,
        questionId: "Q2",
        selectedLevel: 4,
        riskScore: 15,
        notes: "Notes 2",
        evidenceUrls: [],
      };

      await db.saveComplianceResponse(response1);
      await db.saveComplianceResponse(response2);

      // Retrieve responses
      const responses = await db.getComplianceResponsesByAssessment(assessmentId);
      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThanOrEqual(2);

      const questionIds = responses.map((r) => r.questionId);
      expect(questionIds).toContain("Q1");
      expect(questionIds).toContain("Q2");
    });

    it("should update an existing response", async () => {
      const responseData = {
        assessmentId,
        domainId: 1,
        questionId: "Q1",
        selectedLevel: 2,
        riskScore: 50,
        notes: "Initial notes",
        evidenceUrls: [],
      };

      // Save initial response
      const responseId = await db.saveComplianceResponse(responseData);

      // Update response
      const updatedData = {
        ...responseData,
        selectedLevel: 4,
        riskScore: 10,
        notes: "Updated notes",
      };

      const updatedId = await db.saveComplianceResponse(updatedData);

      // Verify it's the same response (ID should match)
      expect(updatedId).toBe(responseId);

      // Retrieve and verify
      const responses = await db.getComplianceResponsesByAssessment(assessmentId);
      const response = responses.find((r) => r.questionId === "Q1");
      expect(response?.selectedLevel).toBe(4);
      expect(response?.riskScore).toBe(10);
      expect(response?.notes).toBe("Updated notes");
    });

    it("should handle unique constraint on (assessmentId, domainId, questionId)", async () => {
      const responseData = {
        assessmentId,
        domainId: 1,
        questionId: "Q1",
        selectedLevel: 3,
        riskScore: 25,
        notes: "Test",
        evidenceUrls: [],
      };

      // Save first response
      const id1 = await db.saveComplianceResponse(responseData);

      // Save same response again (should update)
      const id2 = await db.saveComplianceResponse(responseData);

      // Should be same ID (update, not insert)
      expect(id1).toBe(id2);

      // Should only have one response for this question
      const responses = await db.getComplianceResponsesByAssessment(assessmentId);
      const q1Responses = responses.filter((r) => r.questionId === "Q1");
      expect(q1Responses.length).toBe(1);
    });

    it("should persist responses across different questions in same domain", async () => {
      // Save responses for multiple questions in same domain
      const response1 = {
        assessmentId,
        domainId: 1,
        questionId: "Q1",
        selectedLevel: 3,
        riskScore: 25,
        notes: "Q1 notes",
        evidenceUrls: [],
      };

      const response2 = {
        assessmentId,
        domainId: 1,
        questionId: "Q2",
        selectedLevel: 4,
        riskScore: 15,
        notes: "Q2 notes",
        evidenceUrls: [],
      };

      await db.saveComplianceResponse(response1);
      await db.saveComplianceResponse(response2);

      // Retrieve and verify
      const responses = await db.getComplianceResponsesByAssessment(assessmentId);
      expect(responses.length).toBeGreaterThanOrEqual(2);

      const q1 = responses.find((r) => r.questionId === "Q1");
      const q2 = responses.find((r) => r.questionId === "Q2");

      expect(q1?.selectedLevel).toBe(3);
      expect(q2?.selectedLevel).toBe(4);
      expect(q1?.domainId).toBe(q2?.domainId);
    });
  });

  describe("Assessment Completion Flow", () => {
    let assessmentId: number;

    beforeEach(async () => {
      assessmentId = await db.createComplianceAssessment(testAssessmentData);
    });

    it("should complete an assessment with calculated maturity level", async () => {
      // Save responses
      const responses = [
        { domainId: 1, questionId: "Q1", level: 3 },
        { domainId: 1, questionId: "Q2", level: 4 },
        { domainId: 2, questionId: "Q3", level: 2 },
      ];

      for (const resp of responses) {
        await db.saveComplianceResponse({
          assessmentId,
          domainId: resp.domainId,
          questionId: resp.questionId,
          selectedLevel: resp.level,
          riskScore: 0,
          notes: "",
          evidenceUrls: [],
        });
      }

      // Calculate average maturity
      const avgMaturity = Math.round(
        (3 + 4 + 2) / 3
      );

      // Update assessment to completed
      await db.updateComplianceAssessment(assessmentId, {
        status: "concluida",
        totalQuestions: 3,
        answeredQuestions: 3,
        maturityLevel: avgMaturity,
        overallScore: Math.round(avgMaturity * 20),
        completedAt: new Date().toISOString(),
      });

      // Verify
      const assessment = await db.getComplianceAssessmentById(assessmentId);
      expect(assessment?.status).toBe("concluida");
      expect(assessment?.maturityLevel).toBe(3);
      expect(assessment?.overallScore).toBe(60);
      expect(assessment?.completedAt).toBeDefined();
    });
  });
});
