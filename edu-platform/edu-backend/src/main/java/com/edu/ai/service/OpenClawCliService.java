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

    /**
     * Send a message to an Agent via OpenClaw CLI.
     * This enters the full Session → Transcript → Channel delivery pipeline.
     * The reply will be delivered to configured channels (e.g., Feishu).
     */
    @Async
    public void sendAgentMessage(String message, String agentId, boolean deliverToChannel) {
        try {
            List<String> cmd = new ArrayList<>();
            cmd.add("openclaw");
            cmd.add("agent");
            cmd.add("--message");
            cmd.add(message);
            if (agentId != null && !agentId.equals("main")) {
                cmd.add("--agent");
                cmd.add(agentId);
            }
            if (deliverToChannel) {
                cmd.add("--deliver");
            }

            log.info("Sending agent message via CLI: agent={}, deliver={}, msg={}...",
                    agentId, deliverToChannel, message.substring(0, Math.min(50, message.length())));

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", System.getenv("PATH") + ":/usr/local/bin:/Users/" +
                    System.getProperty("user.name") + "/.npm-global/bin");

            Process process = pb.start();
            boolean finished = process.waitFor(120, TimeUnit.SECONDS);

            if (finished) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                StringBuilder output = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
                log.info("CLI agent response (exit={}): {}...", process.exitValue(),
                        output.substring(0, Math.min(200, output.length())));
            } else {
                process.destroyForcibly();
                log.warn("CLI agent command timed out after 120s");
            }
        } catch (Exception e) {
            log.error("Failed to send agent message via CLI", e);
        }
    }

    /**
     * Send a direct message to a Feishu channel.
     */
    @Async
    public void sendToFeishu(String message, String chatId) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "openclaw", "message", "send",
                    "--channel", "feishu",
                    "--to", chatId,
                    "--text", message
            );
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", System.getenv("PATH") + ":/usr/local/bin:/Users/" +
                    System.getProperty("user.name") + "/.npm-global/bin");

            Process process = pb.start();
            process.waitFor(30, TimeUnit.SECONDS);
            log.info("Feishu message sent (exit={})", process.exitValue());
        } catch (Exception e) {
            log.error("Failed to send Feishu message", e);
        }
    }
}
