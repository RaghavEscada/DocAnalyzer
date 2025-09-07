class DocumentSummarizer {
  constructor() {
    this.currentFile = null;
    this.currentFileContent = null;
    this.apiKey = this.getApiKey();
    this.initializeElements();
    this.setupEventListeners();
    this.loadSettings();
  }

  getApiKey() {
    // Try to get API key from environment variable or user input
    return window.OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
  }

  initializeElements() {
    this.elements = {
      apiKey: document.getElementById("apiKey"),
      uploadArea: document.getElementById("uploadArea"),
      fileInput: document.getElementById("fileInput"),
      fileInfo: document.getElementById("fileInfo"),
      fileName: document.getElementById("fileName"),
      fileSize: document.getElementById("fileSize"),
      removeFile: document.getElementById("removeFile"),
      summarizeBtn: document.getElementById("summarizeBtn"),
      btnText: document.querySelector(".btn-text"),
      btnLoader: document.querySelector(".btn-loader"),
      resultsSection: document.getElementById("resultsSection"),
      summaryContent: document.getElementById("summaryContent"),
      copyBtn: document.getElementById("copyBtn"),
      downloadBtn: document.getElementById("downloadBtn"),
      roleSummariesSection: document.getElementById("roleSummariesSection"),
      roleSummariesContent: document.getElementById("roleSummariesContent"),
      copyRoleSummariesBtn: document.getElementById("copyRoleSummariesBtn"),
      downloadRoleSummariesBtn: document.getElementById("downloadRoleSummariesBtn"),
      checklistSection: document.getElementById("checklistSection"),
      checklistContent: document.getElementById("checklistContent"),
      copyChecklistBtn: document.getElementById("copyChecklistBtn"),
      downloadChecklistBtn: document.getElementById("downloadChecklistBtn"),
      statusMessage: document.getElementById("statusMessage"),
    };
  }

  setupEventListeners() {
    // File upload events
    this.elements.uploadArea.addEventListener("click", () =>
      this.elements.fileInput.click()
    );
    this.elements.fileInput.addEventListener("change", (e) =>
      this.handleFileSelect(e.target.files[0])
    );

    // Drag and drop events
    this.elements.uploadArea.addEventListener("dragover", (e) =>
      this.handleDragOver(e)
    );
    this.elements.uploadArea.addEventListener("dragleave", (e) =>
      this.handleDragLeave(e)
    );
    this.elements.uploadArea.addEventListener("drop", (e) =>
      this.handleDrop(e)
    );

    // Remove file
    this.elements.removeFile.addEventListener("click", () => this.removeFile());

    // Summarize button
    this.elements.summarizeBtn.addEventListener("click", () =>
      this.summarizeDocument()
    );

    // Copy and download actions
    this.elements.copyBtn.addEventListener("click", () =>
      this.copyToClipboard()
    );
    this.elements.downloadBtn.addEventListener("click", () =>
      this.downloadSummary()
    );
    this.elements.copyRoleSummariesBtn.addEventListener("click", () =>
      this.copyRoleSummariesToClipboard()
    );
    this.elements.downloadRoleSummariesBtn.addEventListener("click", () =>
      this.downloadRoleSummaries()
    );
    this.elements.copyChecklistBtn.addEventListener("click", () =>
      this.copyChecklistToClipboard()
    );
    this.elements.downloadChecklistBtn.addEventListener("click", () =>
      this.downloadChecklist()
    );

    // Role tab navigation
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('role-tab')) {
        this.switchRoleTab(e.target);
      }
    });

    // API key input
    this.elements.apiKey.addEventListener("input", () => this.saveApiKey());
  }

  loadSettings() {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey && this.elements.apiKey) {
      this.elements.apiKey.value = savedApiKey;
      this.apiKey = savedApiKey;
    }
  }

  saveApiKey() {
    const apiKey = this.elements.apiKey.value.trim();
    this.apiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
    this.updateSummarizeButton();
  }

  handleDragOver(e) {
    e.preventDefault();
    this.elements.uploadArea.classList.add("dragover");
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.elements.uploadArea.classList.remove("dragover");
  }

  handleDrop(e) {
    e.preventDefault();
    this.elements.uploadArea.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.handleFileSelect(files[0]);
    }
  }

  async handleFileSelect(file) {
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      this.showStatus("Please select a PDF or DOCX file.", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      this.showStatus("File size must be less than 10MB.", "error");
      return;
    }

    this.currentFile = file;
    this.showFileInfo(file);
    this.showStatus("Extracting text from document...", "info");

    try {
      if (file.type === "application/pdf") {
        this.currentFileContent = await this.extractTextFromPDF(file);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        this.currentFileContent = await this.extractTextFromDOCX(file);
      }

      if (this.currentFileContent && this.currentFileContent.length > 50) {
        this.showStatus("Document loaded successfully!", "success");
        this.updateSummarizeButton();
      } else {
        this.showStatus(
          "Could not extract text from document. Please try another file.",
          "error"
        );
        this.removeFile();
      }
    } catch (error) {
      console.error("Error processing file:", error);
      this.showStatus("Error processing file. Please try again.", "error");
      this.removeFile();
    }
  }

  async extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item) => item.str)
              .join(" ");
            fullText += pageText + "\n";
          }

          resolve(fullText.trim());
        } catch (error) {
          reject(error);
        }
      };
      fileReader.onerror = () => reject(new Error("Failed to read PDF file"));
      fileReader.readAsArrayBuffer(file);
    });
  }

  async extractTextFromDOCX(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        mammoth
          .extractRawText({ arrayBuffer: e.target.result })
          .then((result) => resolve(result.value))
          .catch((error) => reject(error));
      };
      reader.onerror = () => reject(new Error("Failed to read DOCX file"));
      reader.readAsArrayBuffer(file);
    });
  }

  showFileInfo(file) {
    this.elements.fileName.textContent = file.name;
    this.elements.fileSize.textContent = this.formatFileSize(file.size);
    this.elements.fileInfo.style.display = "block";
    this.elements.uploadArea.style.display = "none";
  }

  removeFile() {
    this.currentFile = null;
    this.currentFileContent = null;
    this.checklistItems = null;
    this.elements.fileInfo.style.display = "none";
    this.elements.uploadArea.style.display = "block";
    this.elements.resultsSection.style.display = "none";
    this.elements.checklistSection.style.display = "none";
    this.updateSummarizeButton();
    this.hideStatus();
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  updateSummarizeButton() {
    const hasFile = this.currentFile && this.currentFileContent;
    const hasApiKey = this.apiKey && this.apiKey.length > 0;
    this.elements.summarizeBtn.disabled = !hasFile || !hasApiKey;
  }

  async summarizeDocument() {
    if (!this.currentFileContent || !this.apiKey) {
      this.showStatus(
        "Please upload a document and enter your API key.",
        "error"
      );
      return;
    }

    this.setLoadingState(true);
    this.showStatus("Generating summary with AI...", "info");

    try {
      let summary;
      const provider = "openai"; // Default to OpenAI
      const length = "super_detailed"; // Default to super detailed

      if (provider === "openai") {
        const results = await this.summarizeWithOpenAI(
          this.currentFileContent,
          this.apiKey,
          length
        );
        summary = results.summary;
        this.roleSummaries = results.roleSummaries;
        this.checklistItems = results.checklist;
      } else if (provider === "gemini") {
        const results = await this.summarizeWithGemini(
          this.currentFileContent,
          this.apiKey,
          length
        );
        summary = results.summary;
        this.roleSummaries = results.roleSummaries;
        this.checklistItems = results.checklist;
      }

      if (summary) {
        this.displaySummary(summary);
        if (this.roleSummaries) {
          this.displayRoleSummaries(this.roleSummaries);
        }
        if (this.checklistItems) {
          this.displayChecklist(this.checklistItems);
        }
        this.showStatus("Summary, role-wise summaries, and checklist generated successfully!", "success");
      } else {
        throw new Error("Failed to generate summary");
      }
    } catch (error) {
      console.error("Summarization error:", error);
      this.showStatus(`Error: ${error.message}`, "error");
    } finally {
      this.setLoadingState(false);
    }
  }

  async summarizeWithOpenAI(text, apiKey, length) {
    const lengthInstructions = {
      short: "in 2-3 sentences",
      medium: "in one paragraph (4-6 sentences)",
      long: "in 2-3 detailed paragraphs",
      super_detailed: "in a comprehensive, super detailed analysis with the following structure:\n\n**EXECUTIVE SUMMARY**\n- Brief overview of the document\n- Main purpose and scope\n- Key outcomes or conclusions\n\n**KEY FINDINGS & INSIGHTS**\n- Most important discoveries\n- Critical data points\n- Significant trends or patterns\n\n**TECH STACK & TECHNICAL ARCHITECTURE**\n- Technologies, frameworks, and tools mentioned\n- Programming languages and platforms\n- Database systems and infrastructure\n- APIs, libraries, and dependencies\n- Development methodologies and practices\n\n**PROJECT FLOW & PROCESSES**\n- Workflow and process descriptions\n- Step-by-step procedures\n- System interactions and data flow\n- User journeys and experience flows\n- Business processes and operations\n\n**DETAILED ANALYSIS**\n- In-depth examination of main topics\n- Supporting evidence and examples\n- Technical details and specifications\n- Implementation strategies\n\n**IMPORTANT DATA & STATISTICS**\n- Quantitative information\n- Metrics and measurements\n- Comparative data\n- Performance indicators\n\n**CONCLUSIONS & IMPLICATIONS**\n- What the findings mean\n- Business or practical implications\n- Future considerations\n- Technical implications\n\n**RECOMMENDATIONS**\n- Specific action items\n- Strategic suggestions\n- Implementation guidance\n- Technical recommendations\n\nUse bullet points, subheadings, and clear formatting throughout. Provide extensive detail with specific examples, quotes, and thorough explanations.",
    };

    const checklistInstructions = "Additionally, extract and provide a separate actionable checklist organized by roles and responsibilities. Structure it as follows:\n\n**WEB DEVELOPER:**\n- [Specific development tasks]\n- [Technical implementation items]\n\n**GRAPHIC DESIGNER:**\n- [Design-related tasks]\n- [Visual elements to create]\n\n**PROJECT MANAGER:**\n- [Project coordination tasks]\n- [Management activities]\n\n**TOOLS & TECHNOLOGIES:**\n- [Required tools and software]\n- [Technical requirements]\n\n**OTHER ROLES:**\n- [Any other relevant roles and their tasks]\n\nFormat each section with bullet points for specific, actionable items.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Please analyze the following document and provide three separate outputs:\n\n1. SUMMARY: ${lengthInstructions[length]}. Focus on the main points, key findings, and important conclusions.\n\n2. ROLE-WISE SUMMARIES: Create detailed summaries for different roles:\n\n**FOR WEB DEVELOPERS:**\n[Technical summary focusing on development aspects, code requirements, architecture, APIs, databases, frameworks, etc.]\n\n**FOR GRAPHIC DESIGNERS:**\n[Design-focused summary covering visual elements, UI/UX, branding, color schemes, typography, layouts, etc.]\n\n**FOR PROJECT MANAGERS:**\n[Management summary covering timelines, resources, milestones, team coordination, deliverables, etc.]\n\n**FOR BUSINESS STAKEHOLDERS:**\n[Business-focused summary covering objectives, ROI, market impact, strategic goals, etc.]\n\n3. CHECKLIST: ${checklistInstructions}\n\nPlease format your response as follows:\n\nSUMMARY:\n[Your detailed summary here]\n\nROLE-WISE SUMMARIES:\n[Your role-specific summaries here]\n\nCHECKLIST:\n[Your actionable checklist here]\n\nDocument content:\n${text}`,
          },
        ],
        max_tokens: length === "short" ? 150 : length === "medium" ? 300 : length === "long" ? 600 : 3000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`
      );
    }

    const data = await response.json();
    const fullResponse = data.choices[0]?.message?.content?.trim();
    
    // Parse the response to separate summary, role-wise summaries, and checklist
    const summaryMatch = fullResponse.match(/SUMMARY:\s*([\s\S]*?)(?=ROLE-WISE SUMMARIES:|CHECKLIST:|$)/i);
    const roleSummariesMatch = fullResponse.match(/ROLE-WISE SUMMARIES:\s*([\s\S]*?)(?=CHECKLIST:|$)/i);
    const checklistMatch = fullResponse.match(/CHECKLIST:\s*([\s\S]*?)$/i);
    
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : fullResponse,
      roleSummaries: roleSummariesMatch ? roleSummariesMatch[1].trim() : null,
      checklist: checklistMatch ? checklistMatch[1].trim() : null
    };
  }

  async summarizeWithGemini(text, apiKey, length) {
    const lengthInstructions = {
      short: "in 2-3 sentences",
      medium: "in one paragraph (4-6 sentences)",
      long: "in 2-3 detailed paragraphs",
      super_detailed: "in a comprehensive, super detailed analysis with the following structure:\n\n**EXECUTIVE SUMMARY**\n- Brief overview of the document\n- Main purpose and scope\n- Key outcomes or conclusions\n\n**KEY FINDINGS & INSIGHTS**\n- Most important discoveries\n- Critical data points\n- Significant trends or patterns\n\n**TECH STACK & TECHNICAL ARCHITECTURE**\n- Technologies, frameworks, and tools mentioned\n- Programming languages and platforms\n- Database systems and infrastructure\n- APIs, libraries, and dependencies\n- Development methodologies and practices\n\n**PROJECT FLOW & PROCESSES**\n- Workflow and process descriptions\n- Step-by-step procedures\n- System interactions and data flow\n- User journeys and experience flows\n- Business processes and operations\n\n**DETAILED ANALYSIS**\n- In-depth examination of main topics\n- Supporting evidence and examples\n- Technical details and specifications\n- Implementation strategies\n\n**IMPORTANT DATA & STATISTICS**\n- Quantitative information\n- Metrics and measurements\n- Comparative data\n- Performance indicators\n\n**CONCLUSIONS & IMPLICATIONS**\n- What the findings mean\n- Business or practical implications\n- Future considerations\n- Technical implications\n\n**RECOMMENDATIONS**\n- Specific action items\n- Strategic suggestions\n- Implementation guidance\n- Technical recommendations\n\nUse bullet points, subheadings, and clear formatting throughout. Provide extensive detail with specific examples, quotes, and thorough explanations.",
    };

    const checklistInstructions = "Additionally, extract and provide a separate actionable checklist organized by roles and responsibilities. Structure it as follows:\n\n**WEB DEVELOPER:**\n- [Specific development tasks]\n- [Technical implementation items]\n\n**GRAPHIC DESIGNER:**\n- [Design-related tasks]\n- [Visual elements to create]\n\n**PROJECT MANAGER:**\n- [Project coordination tasks]\n- [Management activities]\n\n**TOOLS & TECHNOLOGIES:**\n- [Required tools and software]\n- [Technical requirements]\n\n**OTHER ROLES:**\n- [Any other relevant roles and their tasks]\n\nFormat each section with bullet points for specific, actionable items.";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Please analyze the following document and provide three separate outputs:\n\n1. SUMMARY: ${lengthInstructions[length]}. Focus on the main points, key findings, and important conclusions.\n\n2. ROLE-WISE SUMMARIES: Create detailed summaries for different roles:\n\n**FOR WEB DEVELOPER:**\n[Technical summary focusing on development aspects, code requirements, architecture, APIs, databases, frameworks, etc.]\n\n**FOR GRAPHIC DESIGNER:**\n[Design-focused summary covering visual elements, UI/UX, branding, color schemes, typography, layouts, etc.]\n\n**FOR PROJECT MANAGER:**\n[Management summary covering timelines, resources, milestones, team coordination, deliverables, etc.]\n\n**FOR BUSINESS STAKE:**\n[Business-focused summary covering objectives, ROI, market impact, strategic goals, etc.]\n\n3. CHECKLIST: ${checklistInstructions}\n\nPlease format your response as follows:\n\nSUMMARY:\n[Your detailed summary here]\n\nROLE-WISE SUMMARIES:\n[Your role-specific summaries here]\n\nCHECKLIST:\n[Your actionable checklist here]\n\nDocument content:\n${text}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens:
              length === "short" ? 150 : length === "medium" ? 300 : length === "long" ? 600 : 3000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || `Gemini API error: ${response.status}`
      );
    }

    const data = await response.json();
    const fullResponse = data.candidates[0]?.content?.parts[0]?.text?.trim();
    
    // Parse the response to separate summary, role-wise summaries, and checklist
    const summaryMatch = fullResponse.match(/SUMMARY:\s*([\s\S]*?)(?=ROLE-WISE SUMMARIES:|CHECKLIST:|$)/i);
    const roleSummariesMatch = fullResponse.match(/ROLE-WISE SUMMARIES:\s*([\s\S]*?)(?=CHECKLIST:|$)/i);
    const checklistMatch = fullResponse.match(/CHECKLIST:\s*([\s\S]*?)$/i);
    
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : fullResponse,
      roleSummaries: roleSummariesMatch ? roleSummariesMatch[1].trim() : null,
      checklist: checklistMatch ? checklistMatch[1].trim() : null
    };
  }

  setLoadingState(loading) {
    if (loading) {
      this.elements.btnText.style.display = "none";
      this.elements.btnLoader.style.display = "inline";
      this.elements.summarizeBtn.disabled = true;
    } else {
      this.elements.btnText.style.display = "inline";
      this.elements.btnLoader.style.display = "none";
      this.updateSummarizeButton();
    }
  }

  displaySummary(summary) {
    this.elements.summaryContent.innerHTML = this.formatSummary(summary);
    this.elements.resultsSection.style.display = "block";
    
    // Add compact view toggle
    this.addCompactViewToggle();

    // Smooth scroll to results
    setTimeout(() => {
      this.elements.resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 300);
  }

  addCompactViewToggle() {
    // Check if toggle already exists
    if (document.getElementById('compactToggle')) return;
    
    const toggle = document.createElement('button');
    toggle.id = 'compactToggle';
    toggle.className = 'compact-toggle';
    toggle.textContent = '📄 Compact View';
    toggle.onclick = () => this.toggleCompactView();
    
    // Insert after results title
    const resultsTitle = document.querySelector('.results-title');
    resultsTitle.parentNode.insertBefore(toggle, resultsTitle.nextSibling);
  }

  toggleCompactView() {
    const content = this.elements.summaryContent;
    const toggle = document.getElementById('compactToggle');
    
    if (content.classList.contains('compact-view')) {
      content.classList.remove('compact-view');
      toggle.textContent = '📄 Compact View';
    } else {
      content.classList.add('compact-view');
      toggle.textContent = '📖 Full View';
    }
  }

  formatSummary(summary) {
    // Convert markdown-style formatting to HTML with optimized spacing
    return summary
      .replace(/\*\*(.*?)\*\*/g, '<h3 class="summary-heading">$1</h3>') // Bold text to headings
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>') // Italic to bold
      .replace(/^- (.*$)/gm, '<li class="summary-bullet">$1</li>') // Bullet points
      .replace(/(<li class="summary-bullet">.*<\/li>)/gs, '<ul class="summary-list">$1</ul>') // Wrap bullets in ul
      .replace(/\n\n+/g, '</p><p class="summary-paragraph">') // Multiple newlines to paragraph breaks
      .replace(/\n/g, '<br>') // Single newlines to line breaks
      .replace(/^(?!<[h|u|l])/gm, '<p class="summary-paragraph">') // Wrap non-formatted text in paragraphs
      .replace(/(<p class="summary-paragraph">.*<\/p>)/gs, (match) => {
        // Clean up empty paragraphs and fix nested tags
        return match.replace(/<p class="summary-paragraph"><\/p>/g, '')
                   .replace(/<p class="summary-paragraph">(<[^>]+>)/g, '$1')
                   .replace(/(<\/[^>]+>)<\/p>/g, '$1')
                   .replace(/<br><\/p>/g, '</p>') // Remove trailing breaks
                   .replace(/<p class="summary-paragraph"><br>/g, '<p class="summary-paragraph">'); // Remove leading breaks
      });
  }

  displayRoleSummaries(roleSummaries) {
    if (roleSummaries) {
      this.roleSummariesData = this.parseRoleSummaries(roleSummaries);
      
      // Check if we have any parsed data
      if (Object.keys(this.roleSummariesData).length > 0) {
        this.elements.roleSummariesContent.innerHTML = this.renderRoleSummaries(this.roleSummariesData);
        this.elements.roleSummariesSection.style.display = "block";
        this.showActiveRoleTab();
      } else {
        // Show a message if no role summaries were parsed
        console.log('No role summaries data found, showing fallback message');
        this.elements.roleSummariesContent.innerHTML = `
          <div class="no-content">
            <p>No role-specific summaries were found in the AI response.</p>
            <p>This might be because the document doesn't contain role-specific information, or the AI response format was unexpected.</p>
            <p><strong>Debug Info:</strong> Check the browser console (F12) for detailed parsing information.</p>
          </div>
        `;
        this.elements.roleSummariesSection.style.display = "block";
      }
    } else {
      // Show a message if no role summaries were provided
      this.elements.roleSummariesContent.innerHTML = `
        <div class="no-content">
          <p>No role-wise summaries were generated.</p>
          <p>Try uploading a document with more detailed role-specific information.</p>
        </div>
      `;
      this.elements.roleSummariesSection.style.display = "block";
    }
  }

  parseRoleSummaries(roleSummaries) {
    console.log('Parsing role summaries:', roleSummaries);
    const sections = {};
    let currentSection = null;
    
    const lines = roleSummaries.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for various section header formats
      if (trimmedLine.match(/^\*\*.*\*\*$/) || 
          trimmedLine.match(/^FOR\s+.*:$/i) ||
          trimmedLine.match(/^.*:\s*$/)) {
        
        // Extract section name from different formats
        let sectionName = trimmedLine
          .replace(/\*\*/g, '') // Remove bold markers
          .replace(/^FOR\s+/i, '') // Remove "FOR" prefix
          .replace(/:\s*$/, '') // Remove trailing colon
          .trim();
        
        // Map common variations to standard names
        if (sectionName.toLowerCase().includes('web developer') || sectionName.toLowerCase().includes('developer')) {
          sectionName = 'Web Developer';
        } else if (sectionName.toLowerCase().includes('graphic designer') || sectionName.toLowerCase().includes('designer')) {
          sectionName = 'Graphic Designer';
        } else if (sectionName.toLowerCase().includes('project manager') || sectionName.toLowerCase().includes('manager')) {
          sectionName = 'Project Manager';
        } else if (sectionName.toLowerCase().includes('business') || sectionName.toLowerCase().includes('stakeholder')) {
          sectionName = 'Business Stake';
        }
        
        currentSection = sectionName;
        sections[currentSection] = [];
      } else if (currentSection && trimmedLine) {
        // It's content under current section
        sections[currentSection].push(trimmedLine);
      }
    }
    
    console.log('Parsed sections:', sections);
    return sections;
  }

  renderRoleSummaries(roleData) {
    console.log('Rendering role summaries with data:', roleData);
    
    const roleMapping = {
      'Web Developer': 'web-developer',
      'Graphic Designer': 'graphic-designer', 
      'Project Manager': 'project-manager',
      'Business Stake': 'business-stakeholder',
      'Business Stakeholder': 'business-stakeholder',
      'WEB DEVELOPER': 'web-developer',
      'GRAPHIC DESIGNER': 'graphic-designer', 
      'PROJECT MANAGER': 'project-manager',
      'BUSINESS STAKE': 'business-stakeholder',
      'BUSINESS STAKEHOLDER': 'business-stakeholder'
    };

    let html = '';
    
    for (const [roleName, content] of Object.entries(roleData)) {
      const roleId = roleMapping[roleName] || 'other';
      const contentText = content.join('\n');
      
      console.log(`Rendering role: ${roleName} -> ${roleId} with content:`, contentText);
      
      // If content is empty, add a placeholder
      const displayContent = contentText.trim() || `No specific content found for ${roleName}. This role may not have detailed information in the document.`;
      
      html += `
        <div class="role-content" id="role-${roleId}" style="display: none;">
          <div class="role-summary-text">${this.formatSummary(displayContent)}</div>
        </div>
      `;
    }
    
    console.log('Generated HTML:', html);
    return html;
  }

  switchRoleTab(clickedTab) {
    console.log('Switching to tab:', clickedTab);
    
    // Remove active class from all tabs
    document.querySelectorAll('.role-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    clickedTab.classList.add('active');
    
    // Hide all role content
    document.querySelectorAll('.role-content').forEach(content => {
      content.style.display = 'none';
    });
    
    // Show selected role content
    const roleId = clickedTab.getAttribute('data-role');
    console.log('Looking for role content with ID:', `role-${roleId}`);
    const roleContent = document.getElementById(`role-${roleId}`);
    console.log('Found role content element:', roleContent);
    
    if (roleContent) {
      roleContent.style.display = 'block';
      console.log('Showing role content for:', roleId);
    } else {
      console.log('No role content found for:', roleId);
    }
  }

  showActiveRoleTab() {
    const activeTab = document.querySelector('.role-tab.active');
    if (activeTab) {
      this.switchRoleTab(activeTab);
      
      // Check if the active tab has content, if not, try to show the first available content
      const roleId = activeTab.getAttribute('data-role');
      const roleContent = document.getElementById(`role-${roleId}`);
      
      if (!roleContent || !roleContent.textContent.trim()) {
        console.log('Active tab has no content, looking for first available content');
        const allRoleContent = document.querySelectorAll('.role-content');
        for (const content of allRoleContent) {
          if (content.textContent.trim()) {
            console.log('Found content in:', content.id);
            // Find the corresponding tab and activate it
            const tabRoleId = content.id.replace('role-', '');
            const correspondingTab = document.querySelector(`[data-role="${tabRoleId}"]`);
            if (correspondingTab) {
              this.switchRoleTab(correspondingTab);
              break;
            }
          }
        }
      }
    }
  }

  displayChecklist(checklist) {
    if (checklist) {
      this.elements.checklistContent.innerHTML = this.formatChecklist(checklist);
      this.elements.checklistSection.style.display = "block";
    }
  }

  formatChecklist(checklist) {
    // Parse role-based checklist structure
    const sections = this.parseChecklistSections(checklist);
    return this.renderChecklistColumns(sections);
  }

  parseChecklistSections(checklist) {
    const sections = {};
    let currentSection = null;
    
    const lines = checklist.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if it's a section header (bold text)
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        currentSection = trimmedLine.replace(/\*\*/g, '').trim();
        sections[currentSection] = [];
      } else if (trimmedLine.startsWith('- ') && currentSection) {
        // It's a bullet point under current section
        const task = trimmedLine.replace(/^-\s*/, '').trim();
        if (task) {
          sections[currentSection].push(task);
        }
      }
    }
    
    return sections;
  }

  renderChecklistColumns(sections) {
    const roleIcons = {
      'WEB DEVELOPER': '💻',
      'GRAPHIC DESIGNER': '🎨',
      'PROJECT MANAGER': '📋',
      'TOOLS & TECHNOLOGIES': '🛠️',
      'OTHER ROLES': '👥'
    };

    let html = '<div class="checklist-columns">';
    
    for (const [sectionName, tasks] of Object.entries(sections)) {
      if (tasks.length === 0) continue;
      
      const icon = roleIcons[sectionName] || '📝';
      
      html += `
        <div class="checklist-column">
          <div class="checklist-column-header">
            <span class="role-icon">${icon}</span>
            <h4 class="role-title">${sectionName}</h4>
          </div>
          <div class="checklist-column-content">
            ${tasks.map(task => `
              <div class="checklist-item">
                <input type="checkbox" id="item-${Math.random().toString(36).substr(2, 9)}" class="checklist-checkbox">
                <label for="item-${Math.random().toString(36).substr(2, 9)}" class="checklist-label">${task}</label>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(
        this.elements.summaryContent.textContent
      );
      this.showStatus("Summary copied to clipboard!", "success");
    } catch (error) {
      console.error("Copy failed:", error);
      this.showStatus("Failed to copy to clipboard.", "error");
    }
  }

  downloadSummary() {
    const summary = this.elements.summaryContent.textContent;
    const fileName = this.currentFile
      ? `${this.currentFile.name.split(".")[0]}_summary.txt`
      : "document_summary.txt";

    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus("Summary downloaded successfully!", "success");
  }

  async copyRoleSummariesToClipboard() {
    try {
      let allSummaries = '';
      for (const [roleName, content] of Object.entries(this.roleSummariesData)) {
        allSummaries += `\n=== ${roleName} ===\n`;
        allSummaries += content.join('\n') + '\n';
      }
      await navigator.clipboard.writeText(allSummaries);
      this.showStatus("Role summaries copied to clipboard!", "success");
    } catch (error) {
      console.error("Copy failed:", error);
      this.showStatus("Failed to copy role summaries to clipboard.", "error");
    }
  }

  downloadRoleSummaries() {
    let allSummaries = '';
    for (const [roleName, content] of Object.entries(this.roleSummariesData)) {
      allSummaries += `\n=== ${roleName} ===\n`;
      allSummaries += content.join('\n') + '\n';
    }
    
    const fileName = this.currentFile
      ? `${this.currentFile.name.split(".")[0]}_role_summaries.txt`
      : "document_role_summaries.txt";

    const blob = new Blob([allSummaries], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus("Role summaries downloaded successfully!", "success");
  }

  async copyChecklistToClipboard() {
    try {
      const checklistText = this.elements.checklistContent.textContent;
      await navigator.clipboard.writeText(checklistText);
      this.showStatus("Checklist copied to clipboard!", "success");
    } catch (error) {
      console.error("Copy failed:", error);
      this.showStatus("Failed to copy checklist to clipboard.", "error");
    }
  }

  downloadChecklist() {
    const checklist = this.elements.checklistContent.textContent;
    const fileName = this.currentFile
      ? `${this.currentFile.name.split(".")[0]}_checklist.txt`
      : "document_checklist.txt";

    const blob = new Blob([checklist], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus("Checklist downloaded successfully!", "success");
  }

  showStatus(message, type) {
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
    this.elements.statusMessage.style.display = "block";

    // Auto hide success and info messages after 5 seconds
    if (type === "success" || type === "info") {
      setTimeout(() => this.hideStatus(), 5000);
    }
  }

  hideStatus() {
    this.elements.statusMessage.style.display = "none";
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Set PDF.js worker path
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  // Initialize the app
  new DocumentSummarizer();

  console.log("📄 DocuSummarize AI initialized successfully!");
});
