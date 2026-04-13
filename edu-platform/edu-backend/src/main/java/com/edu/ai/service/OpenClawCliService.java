package com.edu.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Bridges to OpenClaw CLI for operations that require full Gateway WS protocol
 * (session persistence, channel delivery, agent routing).
 *
 * Uses `openclaw agent` command which connects via WebSocket to Gateway,
 * enters the full Session Transcript + ReplyDispatcher pipeline.
 */
@Slf4j
@Service
public class OpenClawCliService {

    private static final String FEISHU_ACCOUNT = "architect";
    private static final String FEISHU_TARGET = "ou_f90bbdfc2ddb90e0afd98845d8be3610";

    /**
     * Send a message to an Agent via OpenClaw CLI AND sync to Feishu.
     * Two-step: 1) agent processes the message 2) message send to Feishu
     */
    @Async
    public void sendAgentMessage(String message, String agentId, boolean deliverToChannel) {
        try {
            // Step 1: Run agent to get AI response (enters Session Transcript)
            List<String> cmd = new ArrayList<>();
            cmd.add("openclaw");
            cmd.add("agent");
            cmd.add("--agent");
            cmd.add(agentId != null ? agentId : "main");
            cmd.add("--message");
            cmd.add(message);

            log.info("Sending agent message via CLI: agent={}, msg={}...",
                    agentId, message.substring(0, Math.min(50, message.length())));

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", System.getenv("PATH") + ":/usr/local/bin:/Users/" +
                    System.getProperty("user.name") + "/.npm-global/bin");

            Process process = pb.start();
            boolean finished = process.waitFor(120, TimeUnit.SECONDS);

            String agentReply = "";
            if (finished) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                StringBuilder output = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    // Filter out config warnings
                    if (!line.contains("Config warnings") && !line.contains("Config was last written") && !line.isEmpty()) {
                        output.append(line).append("\n");
                    }
                }
                agentReply = output.toString().trim();
                log.info("CLI agent response (exit={}): {}...", process.exitValue(),
                        agentReply.substring(0, Math.min(200, agentReply.length())));
            } else {
                process.destroyForcibly();
                log.warn("CLI agent command timed out after 120s");
            }

            // Step 2: Forward to Feishu via message send
            if (deliverToChannel && !agentReply.isEmpty()) {
                String feishuMsg = "💬 [Web用户] " + message + "\n\n🤖 [AI回复] " + agentReply;
                sendToFeishu(feishuMsg, FEISHU_TARGET);
            }
        } catch (Exception e) {
            log.error("Failed to send agent message via CLI", e);
        }
    }

    /**
     * Send a direct message to Feishu via OpenClaw CLI.
     */
    @Async
    public void sendToFeishu(String message, String target) {
        try {
            List<String> cmd = List.of(
                    "openclaw", "message", "send",
                    "--channel", "feishu",
                    "--account", FEISHU_ACCOUNT,
                    "--target", target != null ? target : FEISHU_TARGET,
                    "-m", message
            );

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", System.getenv("PATH") + ":/usr/local/bin:/Users/" +
                    System.getProperty("user.name") + "/.npm-global/bin");

            Process process = pb.start();
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            if (finished) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                String output = reader.lines().filter(l -> l.contains("Sent") || l.contains("error")).findFirst().orElse("");
                log.info("Feishu send (exit={}): {}", process.exitValue(), output);
            }
        } catch (Exception e) {
            log.error("Failed to send Feishu message", e);
        }
    }
}
