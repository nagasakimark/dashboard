import React from 'react';

const LessonPlanViewer = ({ plans, schools, textbooks, onSelect, isSelectionMode, onEdit }) => {
  const getSchoolName = (schoolId) => {
    return schools?.find(s => s.id === schoolId)?.name || 'Unknown School';
  };

  const getTextbookInfo = (textbookId, sectionId) => {
    const textbook = textbooks?.find(t => t.id === textbookId);
    if (!textbook) return { textbookTitle: '', sectionTitle: '' };

    const section = textbook.sections?.find(s => String(s.id) === String(sectionId));
    
    return {
      textbookTitle: textbook.title,
      sectionTitle: section ? `${section.title} (p.${section.pageNumber})` : ''
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.length > 0 ? (
        plans.map(plan => {
          const school = schools?.find(s => s.id === plan.school);
          const textbookInfo = plan.textbook ? getTextbookInfo(plan.textbook, plan.section) : null;

          return (
            <div
              key={plan.id}
              onClick={() => isSelectionMode ? onSelect(plan) : onEdit(plan)}
              className="group bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-200"
            >
              <div
                className="h-1.5 w-full group-hover:h-2 transition-all duration-200"
                style={{ backgroundColor: school?.accentColor || '#4F46E5' }}
              />
              
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-medium group-hover:text-blue-600 transition-colors line-clamp-1">
                    {plan.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Year {plan.yearGroup}</span>
                    <span className="text-gray-400">•</span>
                    <span style={{ color: school?.accentColor }}>
                      {getSchoolName(plan.school)}
                    </span>
                  </div>
                </div>

                {textbookInfo?.textbookTitle && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{textbookInfo.textbookTitle}</span>
                    {textbookInfo.sectionTitle && (
                      <span className="ml-1">• {textbookInfo.sectionTitle}</span>
                    )}
                  </div>
                )}

                {plan.content && (
                  <div 
                    className="text-sm text-gray-600 overflow-hidden line-clamp-4"
                    dangerouslySetInnerHTML={{ __html: plan.content }}
                  />
                )}

                {plan.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {plan.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="col-span-full text-center text-gray-500 py-8 bg-white rounded-lg">
          No lesson plans found.
        </div>
      )}
    </div>
  );
};

export default LessonPlanViewer;


